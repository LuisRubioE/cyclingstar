/// <reference types="node" />
import { execFileSync } from 'node:child_process'
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
 * (`apps/api/src/__fixtures__/broadcast/<etapa>.acta.json.gz`, las seis) da la misma frase dos veces y
 * en dos procesos. Umbral: igualdad exacta. La frase pelada (`chronicleLine`), sus trozos con banderas,
 * maillots y enlaces (`chronicleParts`, lo que se pinta) y las líneas de `linesOf`.
 *
 * El segundo proceso es otro `vitest` sobre este mismo fichero, que en vez de comparar escribe lo que
 * redacta (`CORPUS_CHILD_OUT`): un proceso nuevo no comparte nada del primero (ni memo ni orden de
 * carga), que es lo que «en dos procesos» quiere cazar. Lee ficheros y lanza un proceso, así que lleva
 * la referencia a los tipos de Node.
 */

const FIXTURES = [
  'race-france-e7',
  'race-france-e16',
  'race-france-e18',
  'race-france-e20',
  'race-flanders-e1',
  'race-colombia-e5',
] as const

const actaOf = (name: string): ChronicleEntry[] =>
  JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(`../../../api/src/__fixtures__/broadcast/${name}.acta.json.gz`, import.meta.url),
      ),
    ).toString('utf8'),
  ) as ChronicleEntry[]

/** Todo lo que se redacta de las seis actas, en su orden. */
function corpus(): string[] {
  return FIXTURES.flatMap((name) =>
    actaOf(name).map((e, i) =>
      JSON.stringify([name, i, chronicleLine(e), chronicleParts(e), linesOf(e)]),
    ),
  )
}

const CHILD = process.env.CORPUS_CHILD_OUT

if (CHILD !== undefined)
  describe('B4 · el proceso hijo', () => {
    it('escribe lo que redacta', () => writeFileSync(CHILD, JSON.stringify(corpus())))
  })
else
  describe('B4 · la voz y el acta se redactan igual (§16.4)', () => {
    const first = corpus()

    it('las seis actas, con frase: ninguna clave cruda ni línea vacía donde había frase', () => {
      expect(first.length).toBeGreaterThan(300) // 392 líneas en las seis
      for (const row of first) {
        const [name, i, line] = JSON.parse(row) as [string, number, string]
        expect(line.length, `${name} #${i}`).toBeGreaterThan(0)
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
