import { BROADCAST, type RaceS, type RecorderView, fromDs, toDs } from '@cyclingstar/shared'
import { CLUSTERED, type ChronicleEvent } from './chronicle.js'

/**
 * LOS RACIMOS EN VIVO (E2, docs/retransmision.md §12.3; D-43, 12-d, 12-s, DD-18).
 *
 * La regla B3 del dueño: «No menciones uno a uno todos los ciclistas que se van descolgando: puedes
 * mencionar muchos juntos con número» (`docs/balance.md` l. 1845-1846, v13). En el acta la cumple
 * `groupRuns`; en la voz esa pasada está apagada, porque convierte en racimo una mención que ya se
 * dijo suelta. Aquí el racimo se publica UNA vez, cuando su ventana se cierra, y nunca antes de que
 * se sepa ninguno de sus miembros: así la voz sigue siendo prefijo de sí misma por construcción, y sus
 * sueltos no entran nunca en ella.
 *
 * Solo corre con `BROADCAST.liveClusters`, que nace apagada: se enciende cuando B19 sigue en 0 con
 * racimos sobre las etapas congeladas y la política de nombres real (6b), y la prueba de lectura
 * acepta la espera (§16.5). Medido sin rótulos, la espera es de 1.493 s de carrera de mediana.
 */

/**
 * Lo que los racimos necesitan saber de la línea: en qué grupo va un corredor al final de un bloque y
 * el reloj de ese grupo. Es un trozo de la vista del revelado (`RecorderView`, §4.7): en el 2 la da el
 * adaptador de la radio (`revealStoredEvents`), y desde el 6a la de la línea grabada.
 */
export type ClusterClock = Pick<
  RecorderView,
  'finishS' | 'riderIx' | 'blockOfKm' | 'groupAt' | 'clockAt'
>

/** Un racimo: su suceso nuevo (la plantilla racimo de su par de CLUSTERED), la hora a la que se publica y los sueltos que absorbe. */
export interface LiveCluster {
  readonly event: ChronicleEvent
  /**
   * La hora de carrera a la que se dice, en décimas. Si no es menor que `finishS`, el racimo es solo
   * del acta: la ruta no lo dice, como no dice nada de lo que se revela en la meta, y sus sueltos
   * tampoco salen.
   */
  readonly revealS: RaceS
  /** Los sueltos que absorbe, que no entran en la voz. */
  readonly members: readonly ChronicleEvent[]
}

/**
 * Los racimos en vivo de una etapa (§12.3). La ruta del tramo lo llama tras anotar los papeles y
 * antes de `buildChronicle` (§14.3): ata cada racimo a su hora y quita sus sueltos de la entrada.
 *
 * `ownLine` dice qué suelto conserva su línea y no entra en la cuenta: con la regla de 12-s, los de la
 * fuga, los que llevan un maillot y los del espectador. Sin ella, todos cuentan, que es el peor caso
 * con que B19 lo mide en el 2; la política de nombres real llega en el 6b.
 */
export function liveClusters(
  events: readonly ChronicleEvent[],
  clock: ClusterClock,
  revealS: (e: ChronicleEvent) => RaceS,
  ownLine: (e: ChronicleEvent) => boolean = () => false,
): readonly LiveCluster[] {
  const out: LiveCluster[] = []
  for (const { single, many } of CLUSTERED) {
    // Los sueltos por km, como los ve `groupRuns` en el acta (km redondeado y, a igual km, el reloj).
    const sueltos = events
      .filter((e) => e.plantilla === single && e.datos?.narra !== 0 && !ownLine(e))
      .map((e, i) => ({ e, km: Math.round(e.km), i }))
      .sort((a, b) => a.km - b.km || a.e.tS - b.e.tS || a.i - b.i)
    // Ventanas voraces, como groupRuns: la primera empieza en el primer suelto y mide
    // liveClusterWindowKm; la siguiente, en el primero que quedó fuera.
    for (let a = 0; a < sueltos.length;) {
      const first = sueltos[a]!
      let b = a
      while (
        b + 1 < sueltos.length &&
        sueltos[b + 1]!.km - first.km <= BROADCAST.liveClusterWindowKm
      )
        b += 1
      const run = sueltos.slice(a, b + 1).map((s) => s.e)
      a = b + 1
      if (run.length < BROADCAST.liveClusterMin) continue
      const last = run[run.length - 1]!
      // La hora en que el grupo del ÚLTIMO cruza el final de la ventana (12-d); si ese grupo ya no
      // existe allí, la del último.
      const end = clock.blockOfKm(first.e.km + BROADCAST.liveClusterWindowKm)
      const rider = last.protagonistas[0]
      const r = rider === undefined ? null : clock.riderIx(rider)
      const g = r === null ? null : clock.groupAt(r, end)
      const cierreS = (g === null ? null : clock.clockAt(g, end)) ?? revealS(last)
      // …y nunca antes de que se sepa ninguno de sus miembros.
      const publicaS = Math.max(fromDs(toDs(cierreS)), ...run.map(revealS))
      out.push({
        event: {
          km: last.km,
          tS: last.tS,
          tipo: last.tipo,
          plantilla: many,
          protagonistas: run.flatMap((e) => e.protagonistas),
          // Como los datos del racimo de groupRuns (chronicle.ts): el número, lo que faltaba cuando
          // se fue el último y el km en que empezó la sangría.
          datos: {
            count: run.length,
            toGo: Number(last.datos?.toGo ?? 0),
            from: first.km,
          },
        },
        revealS: publicaS,
        members: run,
      })
    }
  }
  return out
}
