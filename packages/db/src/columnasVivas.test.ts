import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * UNA COLUMNA QUE NADIE ESCRIBE NO ES UN CRITERIO, ES UN CERO (v55).
 *
 * Esta prueba nace de encontrar el mismo defecto dos veces por casualidad, con dos días de
 * diferencia y buscando otra cosa. `riders.fame` decidía los ascensos y descensos entre divisiones,
 * los anuncios de retirada, la selección de escuadra y el orden de los agentes libres… y es un
 * `real DEFAULT 0` que **no se escribe en ninguna parte del repositorio**. Todo el mundo empataba a
 * cero, así que quien decidía de verdad era el desempate. Medido: el equipo con 900 puntos descendía
 * de WorldTour y el de 5 se quedaba.
 *
 * NINGUNA PRUEBA PODÍA CAZARLO, y ése es el punto. Un valor por defecto que nadie mueve no rompe
 * nada: hace que todo EMPATE. El código corre, la consulta devuelve filas, el orden sale, y el
 * criterio simplemente no discrimina. Por eso hace falta una alarma ESTÁTICA y no de comportamiento.
 *
 * QUÉ VIGILA: toda columna numérica con un valor por defecto —la forma exacta del defecto: nace con
 * un número y espera que alguien lo mueva— tiene que escribirse en algún sitio de `packages/db` o
 * `apps/api`. Si no, o se alimenta o se pone en la lista de abajo diciendo por qué.
 *
 * QUÉ **NO** VIGILA, para que nadie se fíe de más: solo mira columnas con default numérico, y solo
 * si se ESCRIBEN, no si se escriben BIEN. Una columna alimentada con basura pasa en verde.
 */

const aquí = dirname(fileURLToPath(import.meta.url))

/**
 * Las que se sabe que están muertas, con su porqué. Vaciar esta lista no es el objetivo: el objetivo
 * es que nadie AÑADA una sin darse cuenta. Quitar una de aquí solo se hace alimentándola.
 */
const MUERTAS_CONOCIDAS: Record<string, string> = {
  fame: `Prestigio de carrera. Nunca se ha escrito (migración 0002). Decidía cuatro cosas y ya no
    decide ninguna (v55): ascensos y descensos, anuncios de retirada, escuadra y orden de agentes
    libres usan ahora \`seasonPoints\` o el palmarés. La columna se queda porque «fama» puede ser un
    concepto que el juego quiera —distinto de los puntos de una temporada— y eso lo decide el dueño.`,
  teamTrust: `Confianza del corredor con su equipo. Nunca se ha escrito (migración 0002), así que
    todos valen 50. La usa \`selectSquad\` con peso 0,4 sobre 4,0, o sea que aporta un 5 % CONSTANTE
    a todo el mundo y no ordena nada: la dimensión está diseñada y no existe. Alimentarla es trabajo
    de G2 (gestión humana de un equipo): la confianza sube y baja con convocatorias, resultados,
    renovaciones y promesas cumplidas, y eso hay que diseñarlo, no inventarlo aquí.`,
}

function ficherosTs(dir: string, out: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    const p = join(dir, nombre)
    if (nombre === 'node_modules' || nombre === 'dist') continue
    if (statSync(p).isDirectory()) {
      ficherosTs(p, out)
      continue
    }
    if (!nombre.endsWith('.ts') && !nombre.endsWith('.tsx')) continue
    if (nombre.includes('.test.') || nombre === 'schema.ts') continue
    out.push(p)
  }
  return out
}

describe('db: ninguna columna nace con un número y se queda ahí', () => {
  it('toda columna numérica con valor por defecto se escribe en alguna parte', () => {
    const schema = readFileSync(join(aquí, 'schema.ts'), 'utf8')
    const columnas: string[] = []
    const re =
      /^ {4}(\w+): (?:real|integer|doublePrecision)\('([\w_]+)'\)([^\n]*\.default\(\s*-?\d[\d._]*\s*\)[^\n]*)$/gm
    for (const m of schema.matchAll(re)) columnas.push(m[1]!)
    // Si esto se queda a cero, el escáner ha dejado de encontrar columnas y la prueba no vigila nada.
    expect(`columnas encontradas: ${columnas.length > 10}`).toBe('columnas encontradas: true')

    const raíz = join(aquí, '..', '..', '..')
    const fuentes = [
      ...ficherosTs(join(raíz, 'packages', 'db', 'src')),
      ...ficherosTs(join(raíz, 'apps', 'api', 'src')),
    ]
    const líneas = fuentes.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((l) => l.trim()),
    )

    const muertas: string[] = []
    for (const campo of new Set(columnas)) {
      const escrita = líneas.some((t) => {
        // Propiedad abreviada dentro de un objeto: `facilities,` sí escribe.
        if (new RegExp(`^${campo},$`).test(t)) return true
        if (!new RegExp(`\\b${campo}\\s*:`).test(t)) return false
        // Referirse a la COLUMNA de drizzle no es escribirla: `fame: riders.fame`.
        if (new RegExp(`\\b${campo}\\s*:\\s*\\w+\\.${campo}\\b`).test(t)) return false
        // Ni declarar un tipo: `fame: number` en una interfaz no escribe nada.
        if (new RegExp(`\\b${campo}\\s*:\\s*(number|string|boolean)\\b`).test(t)) return false
        return true
      })
      if (!escrita) muertas.push(campo)
    }

    const inesperadas = muertas.filter((c) => MUERTAS_CONOCIDAS[c] === undefined)
    expect(`columnas muertas nuevas: ${inesperadas.join(', ') || 'ninguna'}`).toBe(
      'columnas muertas nuevas: ninguna',
    )

    // …y al revés: si una conocida ya se alimenta, que se quite de la lista y de aquí.
    const resucitadas = Object.keys(MUERTAS_CONOCIDAS).filter((c) => !muertas.includes(c))
    expect(`conocidas que ya se escriben: ${resucitadas.join(', ') || 'ninguna'}`).toBe(
      'conocidas que ya se escriben: ninguna',
    )
  })
})
