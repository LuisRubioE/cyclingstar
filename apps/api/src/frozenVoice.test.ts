import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { BROADCAST, type LiveLine } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  FIXTURES,
  type FixtureName,
  fixtureNames,
  loadEvents,
  loadTimeline,
} from './__fixtures__/broadcast/load.js'
import { recordedClockOf } from './broadcastSource.js'
import { buildChronicle } from './chronicle.js'
import { lineVoiceOf } from './voiceRoles.js'

/**
 * LA VOZ CONGELADA DE LAS SEIS ETAPAS (B5, la parte de la voz; docs/retransmision.md §12.7 y §16.4; E2,
 * paso 12).
 *
 * B5 sella con un `sha256` todas las líneas de voz y de acta de las seis etapas congeladas tal como las
 * pinta la web (`apps/web/src/domain/stageJournal.corpus.test.ts`). El acta ya estaba congelada desde el
 * paso 2 (`<etapa>.acta.json.gz`, las `ChronicleEntry` que sirve la ruta de etapa); la voz la arma la API
 * al servir cada tramo y la web no la puede construir, porque `buildChronicle` y `lineVoiceOf` viven en
 * `apps/api`. Por eso la voz entera de cada etapa, hasta el borde de la meta, se congela aquí en
 * `<etapa>.voz.json.gz`: las `LiveLine` que, tramo a tramo, sirve la ruta (B19 promete que sus tramos
 * seguidos son esta voz), construidas como `buildVoice` de `routes/broadcast.ts` (los sucesos de la línea
 * con su hora, los papeles de `withGroupRoles` y los racimos si `BROADCAST.liveClusters` está encendida)
 * con los nombres de prueba del manifiesto, como B19 (`voicePrefix.test.ts`).
 *
 * Este test comprueba que lo congelado es lo que la API construye hoy: si la voz de una etapa ya corrida
 * cambia (una pasada nueva de `buildChronicle`, los racimos encendidos, otras palabras de grupo, unos
 * fixtures regenerados), se pone en rojo, y el cambio se hace a propósito: se reescriben los ficheros con
 * `VOZ_CONGELADA=escribe pnpm exec vitest run apps/api/src/frozenVoice.test.ts` y se re-sella B5 en la web
 * con la causa escrita. Los ficheros no van en `manifest.json`, que escribe `scripts/broadcast-fixtures.mjs`
 * (su `--check` no los conoce).
 */

const WRITE = process.env.VOZ_CONGELADA === 'escribe'

const fileOf = (name: FixtureName): URL =>
  new URL(`./__fixtures__/broadcast/${name}.voz.json.gz`, import.meta.url)

/** La voz de una etapa hasta la meta, como la sirve la ruta del tramo (§14.3), en JSON. */
function frozenVoiceOf(name: FixtureName): LiveLine[] {
  const tl = loadTimeline(name)
  const { entrada, revealOf, finishS } = lineVoiceOf(
    tl,
    loadEvents(name),
    recordedClockOf(tl),
    BROADCAST.liveClusters ? 'named' : 'off',
  )
  const voice = buildChronicle(entrada, fixtureNames(name), {
    byClock: tl.timeTrial,
    live: { untilS: finishS, stageKm: tl.lengthKm, revealS: (ev) => revealOf.get(ev) ?? finishS },
  })
  // lo que viaja por la red: sin `undefined` ni prototipos
  return JSON.parse(JSON.stringify(voice)) as LiveLine[]
}

describe('B5 · la voz congelada de las seis etapas es la que construye hoy la ruta (§12.7, §16.4)', () => {
  it.each(FIXTURES)('%s', (name) => {
    const voice = frozenVoiceOf(name)
    // No vacía: que la igualdad no sea de una voz muda contra otra.
    expect(voice.length).toBeGreaterThan(10)
    if (WRITE) writeFileSync(fileOf(name), gzipSync(JSON.stringify(voice), { level: 9 }))
    const frozen = JSON.parse(gunzipSync(readFileSync(fileOf(name))).toString('utf8')) as unknown
    expect(
      frozen,
      `la voz de ${name} ha cambiado: si es a propósito, VOZ_CONGELADA=escribe y re-sella B5 (stageJournal.corpus.test.ts)`,
    ).toEqual(voice)
  })
})
