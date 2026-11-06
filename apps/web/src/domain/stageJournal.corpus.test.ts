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
 *
 * RE-SELLADO EN EL 17a (E3, docs/visual.md §14.1; D-00c): la mención de un corredor pasa a escribirse en
 * el orden que fijó el dueño, el dorsal, la bandera, el nombre y el maillot, y después el equipo; antes
 * abría con el maillot y la bandera. Lo que dice cada etapa no cambia: la frase pelada (`chronicleLine`)
 * es la misma byte a byte en las 1.020, y quitando las marcas de bandera y de maillot también lo pintado;
 * cambian de sitio las marcas, en 831 de ellas. Era `d54f2219c8ede513c00471cc09c514bcf20f8a4f53f8a90a0ca8121f9796224b`.
 *
 * RE-SELLADO EN W1 (la revisión de `Watch` del dueño, su punto 4): el grupo de cabeza que lleva el amarillo y
 * no es el pelotón se llama `Race leader’s group` en la barra, y la voz dice la palabra de la barra (D-18) por
 * el grupo del título cuando va en cabeza (`mainJersey`, que también nombra al sujeto de los partes de
 * ventaja) y por el grupo de su primer protagonista en las ocho plantillas que hablan de él (`groupJersey`,
 * `RIDER_GROUP_TEMPLATES`, apps/api). La voz congelada gana `mainJersey` en 10 líneas (8 de la e18 y 2 de la
 * e20) y `groupJersey` en otras 10 (5 de la e18, 3 de la e20 y 2 de la e5 de Colombia), y nada más. De las
 * 1.020 que se pintan cambian 13, todas a `the race leader’s group`: diez decían `the lead group` (el grupo
 * que cierra un ataque, cuatro partes de ventaja, dos selecciones, dos cortes y la cabeza que crece en la e5)
 * y tres `the chase group` (una selección de la e18, otra de la e20 y lo que queda de una criba en la e20),
 * por un grupo que la barra ya llamaba por su maillot. Las otras siete anotadas no nombran a un grupo por su
 * palabra: nombran corredores o a nadie. Era `833679eca9e3f19df7ce87f8c27aed31618789734ffc04c809384e58649cc091`.
 *
 * RE-SELLADO EN W2b (la revisión de `Watch` del dueño; D-18): la voz dice la palabra de la barra de cada grupo
 * del que habla, no solo la de su maillot. La voz congelada gana `groupHead` en 44 líneas (las del grupo de sus
 * protagonistas que casa, 11 de ellas fuera de cabeza), `groupRole` en 25 (21 de esas 44, las que la barra
 * rotula por su papel, y el grupo que caza en 4 ataques cazados), `groupJersey` en otros 3 ataques cazados y
 * `chaseJersey` en 8 partes de ventaja, y nada más. De las 1.020 que se pintan cambian 20: los 8 partes dicen
 * `over the race leader’s group` donde decían `over the chase group`; los 5 ataques cazados, el grupo que los
 * caza (3 `the race leader’s group`, 1 `the lead group` y 1 `the chase group`) donde decían el del título; 3
 * cortes y una selección, `the chase group` donde decían `the lead group`, y otra selección «is left alone»
 * donde decía «is left alone in front»; y las 2 cabezas que crecen fuera de cabeza, «together now» sin «clear»
 * donde decían «at the front now».
 * Era `ea9ece4a725ae6992604edc9988f89c8cdf33802f63ba27fac078164a6a7107f`.
 */
const B5_SHA256 = '4ee0811b6e9a0a61c87e44ef9e3a77d7c8a68e62f90daaffb77fd21749798b53'

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

  describe('W1 · el grupo del maillot, en la voz congelada (D-18)', () => {
    it('ninguna línea con el maillot de su grupo dice su sitio, ni el parte del título en cabeza', () => {
      const anotadas: string[] = []
      const malas: string[] = []
      for (const name of FIXTURES)
        fixtureOf(name, 'voz').forEach((e, i) => {
          // el grupo de un protagonista (fuera de la caída, que lo dice con su papel), o el título en cabeza
          // como sujeto de un parte de ventaja
          const deUnProtagonista = e.plantilla !== 'crash' && e.datos?.groupJersey !== undefined
          const tituloEnCabeza =
            e.plantilla.startsWith('time_gap') &&
            e.datos?.mainRole === 'lead' &&
            e.datos.mainJersey !== undefined
          if (!deUnProtagonista && !tituloEnCabeza) return
          anotadas.push(`${name} ${i}`)
          const sitio = deUnProtagonista ? /the (lead|chase) group/i : /the lead group/i
          for (const l of painted(e)) if (sitio.test(l)) malas.push(`${name} ${i} ${l}`)
        })
      // las diez del grupo de un protagonista y los cuatro partes de la e18 (el re-sellado de W1, arriba), y
      // desde W2b los tres ataques cazados por el grupo del líder
      expect(anotadas).toHaveLength(17)
      expect(malas).toEqual([])
    })
  })

  describe('W2b · la palabra de la barra para cada grupo, en la voz congelada (D-18)', () => {
    it('ningún grupo de la frase fuera de cabeza dice que va delante, ni la referencia anotada «over the chase group»', () => {
      const fuera: string[] = []
      const malas: string[] = []
      let referencias = 0
      for (const name of FIXTURES)
        fixtureOf(name, 'voz').forEach((e, i) => {
          if (e.datos?.groupHead === 0) {
            fuera.push(`${name} ${i}`)
            for (const l of painted(e))
              if (/in front|at the front|up front|up the road|the lead group|leaders/i.test(l))
                malas.push(`${name} ${i} ${l}`)
          }
          if (e.datos?.chaseJersey !== undefined || e.datos?.chaseRole !== undefined) {
            referencias++
            for (const l of painted(e))
              if (/over the chase group/.test(l)) malas.push(`${name} ${i} ${l}`)
          }
        })
      // las 11 que la barra enseña detrás (el re-sellado de W2b, arriba) y las 8 referencias anotadas
      expect(fuera).toHaveLength(11)
      expect(referencias).toBe(8)
      expect(malas).toEqual([])
    })
  })

  describe('B5 · lo que dicen las etapas ya vistas no cambia (§12.7, §16.4)', () => {
    it('el sha256 de las líneas de voz y de acta de las seis, como se pintan', () => {
      const lines = b5Lines()
      expect(lines.length).toBe(1020)
      expect(createHash('sha256').update(lines.join('\n')).digest('hex')).toBe(B5_SHA256)
    })
  })
}
