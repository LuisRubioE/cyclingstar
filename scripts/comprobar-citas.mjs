/**
 * ¿SIGUEN EN SU SITIO LAS CITAS DEL DOCUMENTO? (docs/generador.md §15.2, paso 0).
 *
 * El documento del generador cita código por fichero y línea («`stageKind.ts` l. 27»,
 * «`finalKind.ts::lastClimbKm` (l. 46-57)», «`STAGE.climbRaceKmToGo` (`constants.ts` l. 3820)»). El
 * código se mueve y las citas no: este script extrae cada pareja fichero, línea y símbolo citado, y
 * comprueba con el árbol del día que el símbolo está en esa línea (o en ese rango). Imprime las que
 * se han movido con su línea nueva, y las que no se pueden comprobar (fichero que aún no existe,
 * nombre ambiguo, cita sin símbolo).
 *
 * El símbolo de una cita es el de `fichero::símbolo` si lo hay; si no, el último identificador entre
 * comillas invertidas que la precede en la misma línea del documento, a menos de 160 caracteres
 * (`STAGE.climbRaceKmToGo` → `climbRaceKmToGo`). Es una heurística: una cita «movida» es una a
 * revisar, no un error seguro, y el resumen lo dice.
 *
 * Uso: node scripts/comprobar-citas.mjs [docs/generador.md] [--todas]
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const doc = args.find((a) => !a.startsWith('--')) ?? 'docs/generador.md'
const todas = args.includes('--todas')

const ficheros = execFileSync('git', ['ls-files'], { cwd: RAIZ }).toString().trim().split('\n')
const cache = new Map()
const lineasDe = (f) => {
  if (!cache.has(f)) cache.set(f, readFileSync(`${RAIZ}/${f}`, 'utf8').split('\n'))
  return cache.get(f)
}

/** El fichero del árbol que corresponde a un nombre citado (ruta completa o sufijo). */
function resolver(citado) {
  const exacto = ficheros.filter((f) => f === citado || f.endsWith(`/${citado}`))
  if (exacto.length <= 1) return exacto[0] ?? null
  const motor = exacto.filter((f) => f.startsWith('packages/engine/src/'))
  if (motor.length === 1) return motor[0]
  return 'ambiguo'
}

const CITA =
  /`([\w./-]+\.(?:ts|tsx|mjs|js|json|yml|yaml))(?:::([\w$.]+))?`\s*\(?\s*l\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/g
const IDENT = /`([A-Za-z_$][\w$.]*)(?:\(\))?`/g
const FICHERO = /\.(?:ts|tsx|mjs|js|json|yml|yaml|md)$/

const texto = readFileSync(`${RAIZ}/${doc}`, 'utf8').split('\n')
const res = { cuadra: [], movida: [], ausente: [], sinFichero: [], ambigua: [], sinSimbolo: [] }
texto.forEach((linea, i) => {
  for (const m of linea.matchAll(CITA)) {
    const [, citado, explicito, desde, hasta] = m
    let simbolo = explicito ?? null
    if (simbolo === null) {
      const antes = linea.slice(Math.max(0, m.index - 160), m.index)
      const ids = [...antes.matchAll(IDENT)].map((x) => x[1]).filter((x) => !FICHERO.test(x))
      simbolo = ids.at(-1) ?? null
    }
    if (simbolo !== null) simbolo = simbolo.split('.').filter(Boolean).at(-1) ?? null
    const n0 = Number(desde)
    const n1 = hasta ? Number(hasta) : n0
    const cita = { docLinea: i + 1, citado, simbolo, desde: n0, hasta: n1 }
    const f = resolver(citado)
    if (f === null) {
      res.sinFichero.push(cita)
      continue
    }
    if (f === 'ambiguo') {
      res.ambigua.push(cita)
      continue
    }
    if (simbolo === null || simbolo.length < 3 || !/^[A-Za-z_$][\w$]*$/.test(simbolo)) {
      res.sinSimbolo.push(cita)
      continue
    }
    const lineas = lineasDe(f)
    const re = new RegExp(`\\b${simbolo.replace(/\$/g, '\\$')}\\b`)
    let ok = false
    for (let n = n0; n <= n1 && !ok; n++) ok = re.test(lineas[n - 1] ?? '')
    if (ok) {
      res.cuadra.push(cita)
      continue
    }
    const donde = lineas.flatMap((l, k) => (re.test(l) ? [k + 1] : []))
    if (donde.length === 0) res.ausente.push({ ...cita, fichero: f })
    else res.movida.push({ ...cita, fichero: f, ahora: donde })
  }
})

const total = Object.values(res).reduce((a, l) => a + l.length, 0)
const comprobables = res.cuadra.length + res.movida.length + res.ausente.length
console.log(
  `# Citas de ${doc} contra el árbol de ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RAIZ }).toString().trim()}\n`,
)
console.log('| Resultado | Citas |')
console.log('| --- | --- |')
console.log(`| Extraídas (fichero y línea) | ${total} |`)
console.log(`| Comprobables (fichero único y símbolo) | ${comprobables} |`)
console.log(`| El símbolo está en la línea citada | ${res.cuadra.length} |`)
console.log(`| El símbolo está en el fichero, en otra línea (a revisar) | ${res.movida.length} |`)
console.log(`| El símbolo no aparece en el fichero | ${res.ausente.length} |`)
console.log(
  `| Fichero que no existe en el árbol (futuro o renombrado) | ${res.sinFichero.length} |`,
)
console.log(`| Nombre de fichero ambiguo | ${res.ambigua.length} |`)
console.log(`| Sin símbolo reconocible | ${res.sinSimbolo.length} |`)

const lista = (titulo, xs, fmt) => {
  if (xs.length === 0) return
  console.log(`\n## ${titulo} (${xs.length})\n`)
  for (const x of todas ? xs : xs.slice(0, 60)) console.log(`- ${fmt(x)}`)
  if (!todas && xs.length > 60) console.log(`- … y ${xs.length - 60} más (--todas para verlas)`)
}
lista(
  'Movidas',
  res.movida,
  (x) =>
    `l. ${x.docLinea}: \`${x.citado}\` l. ${x.desde}${x.hasta !== x.desde ? `-${x.hasta}` : ''} \`${x.simbolo}\` → hoy l. ${x.ahora.slice(0, 5).join(', ')}${x.ahora.length > 5 ? ', …' : ''}`,
)
lista(
  'Símbolo ausente',
  res.ausente,
  (x) => `l. ${x.docLinea}: \`${x.citado}\` l. ${x.desde} \`${x.simbolo}\` (${x.fichero})`,
)
lista(
  'Fichero inexistente',
  res.sinFichero,
  (x) => `l. ${x.docLinea}: \`${x.citado}\` l. ${x.desde}`,
)
