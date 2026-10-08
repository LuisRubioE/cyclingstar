/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import type { ChronicleEntry } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { chronicleLine, chronicleParts, linesOf } from './stageJournal'

/**
 * B4 · EL RE-RENDER DE LA VOZ Y DEL ACTA (docs/retransmision.md §12.7 y §16.4; paso 6b). La voz y el
 * acta se redactan desde `seed + data`: cada `ChronicleEntry` de las actas congeladas
 * (`apps/api/src/__fixtures__/broadcast/<etapa>.acta.json.gz`, las seis) y, desde el paso 12, cada línea
 * de su voz (`<etapa>.voz.json.gz`, la que sirve la ruta del tramo, congelada por
 * `apps/api/src/frozenVoice.test.ts`) da la misma frase dos veces y en dos procesos. Umbral: igualdad
 * exacta. La frase pelada (`chronicleLine`), sus trozos con banderas, maillots y enlaces
 * (`chronicleParts`, lo que se pinta) y las líneas de `linesOf`.
 *
 * El segundo proceso es otro `vitest` sobre este mismo fichero, que en vez de comparar escribe lo que
 * redacta (`CORPUS_CHILD_OUT`): un proceso nuevo no comparte nada del primero (ni memo ni orden de
 * carga), que es lo que «en dos procesos» quiere cazar. Lee ficheros y lanza un proceso, así que lleva
 * la referencia a los tipos de Node.
 *
 * B5 · LA ESTABILIDAD (§12.7 y §16.4; paso 12): el `sha256` de todas esas líneas tal como se pintan, con
 * la revisión de plantillas de las seis (la 0). Se sella UNA vez, en el paso 12, tras la semilla neutra
 * (D-46), y desde entonces solo cambia con un re-sellado deliberado, con la causa escrita aquí: una
 * redacción nueva entra con `since` igual al `TEMPLATE_REV` nuevo y no lo mueve. Si se mueve, alguien ha
 * cambiado lo que dice una etapa ya vista. La otra mitad de B5, los trece goldens de las noticias, está
 * con ellos, en `packages/shared/src/news.test.ts`: la web no importa los datos de un test de `shared`.
 */

const FIXTURES = [
  'race-france-e7',
  'race-france-e16',
  'race-france-e18',
  'race-france-e20',
  'race-flanders-e1',
  'race-colombia-e5',
] as const

/** La revisión de plantillas con que se corrieron las seis (`stage_timelines.tpl_rev`, 12-c): la 0. */
const FIXTURES_REV = 0

const fixtureOf = (name: string, kind: 'acta' | 'voz'): ChronicleEntry[] =>
  JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(`../../../api/src/__fixtures__/broadcast/${name}.${kind}.json.gz`, import.meta.url),
      ),
    ).toString('utf8'),
  ) as ChronicleEntry[]

/** Todo lo que se redacta de las seis actas y sus seis voces, en su orden. */
function corpus(): string[] {
  return FIXTURES.flatMap((name) =>
    (['acta', 'voz'] as const).flatMap((kind) =>
      fixtureOf(name, kind).map((e, i) =>
        JSON.stringify([
          name,
          kind,
          i,
          chronicleLine('en', e, FIXTURES_REV),
          chronicleParts('en', e, FIXTURES_REV),
          linesOf('en', e, FIXTURES_REV),
        ]),
      ),
    ),
  )
}

/**
 * Una línea como se pinta: el texto con los nombres enlazados (`chronicleLine` los quita con su marca),
 * las banderas como `[ES]` y los maillots como `<gc>`; la caída, con sus nombres detrás (`linesOf`).
 */
function painted(e: ChronicleEntry): string[] {
  const lines = e.plantilla === 'crash' ? [e, { ...e, plantilla: 'crash_names' }] : [e]
  return lines
    .map((x) =>
      chronicleParts('en', x, FIXTURES_REV)
        .map((p) => ('flag' in p ? `[${p.flag}]` : 'jersey' in p ? `<${p.jersey}>` : p.text))
        .join(''),
    )
    .filter((l) => l !== '')
}

/** Las líneas de B5, cada una con su etapa, su fuente y su número. */
function b5Lines(): string[] {
  return FIXTURES.flatMap((name) =>
    (['acta', 'voz'] as const).flatMap((kind) =>
      fixtureOf(name, kind).flatMap((e, i) => painted(e).map((l) => `${name} ${kind} ${i} ${l}`)),
    ),
  )
}

/**
 * B5, SELLADO EN EL PASO 12 (D-46): las 392 entradas de las seis actas y las 576 líneas de sus voces,
 * que se pintan en 1.020 líneas (las 52 caídas de la voz, en dos: la caída y sus nombres). Al sellarlo,
 * la semilla neutra cambió la redacción de 367 de esas líneas (128 del acta y 239 de la voz) de las 672
 * que eligen entre dos o más (232 y 440): el 55 %, donde 1 − 1/n estimaba de la mitad a dos tercios.
 */
const B5_SHA256 = 'd54f2219c8ede513c00471cc09c514bcf20f8a4f53f8a90a0ca8121f9796224b'

const CHILD = process.env.CORPUS_CHILD_OUT

if (CHILD !== undefined)
  describe('B4 · el proceso hijo', () => {
    it('escribe lo que redacta', () => writeFileSync(CHILD, JSON.stringify(corpus())))
  })
else {
  describe('B4 · la voz y el acta se redactan igual (§16.4)', () => {
    const first = corpus()

    it('las seis actas y sus seis voces, con frase: ninguna clave cruda ni línea vacía donde había frase', () => {
      expect(first.length).toBeGreaterThan(900) // 392 líneas del acta y 576 de la voz
      for (const row of first) {
        const [name, kind, i, line] = JSON.parse(row) as [string, string, number, string]
        expect(line.length, `${name} ${kind} #${i}`).toBeGreaterThan(0)
      }
    })

    it('dos veces en el mismo proceso, la misma frase', () => {
      expect(corpus()).toEqual(first)
    })

    it('en otro proceso, la misma frase', () => {
      const dir = mkdtempSync(join(tmpdir(), 'b4-'))
      const out = join(dir, 'corpus.json')
      try {
        const root = fileURLToPath(new URL('../../../../', import.meta.url))
        execFileSync(
          process.execPath,
          [join(root, 'node_modules/vitest/vitest.mjs'), 'run', fileURLToPath(import.meta.url)],
          {
            cwd: root,
            env: { ...process.env, CORPUS_CHILD_OUT: out },
            stdio: 'ignore',
            timeout: 120_000,
          },
        )
        expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual(first)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }, 150_000)
  })

  describe('B5 · lo que dicen las etapas ya vistas no cambia (§12.7, §16.4)', () => {
    it('el sha256 de las líneas de voz y de acta de las seis, como se pintan', () => {
      const lines = b5Lines()
      expect(lines.length).toBe(1020)
      expect(createHash('sha256').update(lines.join('\n')).digest('hex')).toBe(B5_SHA256)
    })
  })
}
