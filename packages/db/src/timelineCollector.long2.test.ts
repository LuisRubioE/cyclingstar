import { describe } from 'vitest'
import { LONG, same } from './timelineCollectorBench.js'

/**
 * B10, EL NOCTURNO (E2, docs/retransmision.md §16.4, 16-g): las once últimas etapas en línea de las 24
 * del mapa 07 §7, por dos semillas. Solo con `CS_BANCOS=1`, que pone `cobertura.yml`; `long1` lleva las
 * once primeras, y los dos corren en paralelo.
 */
describe.runIf(process.env.CS_BANCOS === '1')(
  'B10 · las once últimas etapas en línea por dos semillas (nocturno)',
  () => same(LONG.slice(22)),
)
