/**
 * MOTIVOS DE LA GRAMÁTICA DE RECORRIDOS (docs/generador.md §3.2).
 *
 * Un motivo es una pieza de carretera con significado ciclista (un enlace, una cota, un muro, un
 * racimo de sectores, la meta): la unidad que la semilla decide primero. Todo en km y % redondeados
 * a 0,1.
 *
 * Paso 0: nació `MetaKind`, porque `RouteStats` del censo (`sim/routeCensus.ts`) la cita. Paso 1: el
 * resto de tipos (`MotifKind`, `Motif`, `RngFactory`, `Instancia`), sin lógica. Paso 3:
 * `validateMotif` y `renderMotif`; paso 5: `instanciarFirma` e `instanciar`.
 */

export type MotifKind =
  | 'enlace'
  | 'expuesto'
  | 'tendida'
  | 'descenso' // enlaces
  | 'cota'
  | 'puerto'
  | 'muro'
  | 'cadena'
  | 'sector'
  | 'racimo'
  | 'circuito' // dificultades
  | 'meta' // siempre el último

/** Cómo acaba una etapa: la meta instanciada, siempre el último motivo. */
export type MetaKind =
  | 'esprint'
  | 'repecho'
  | 'muro_meta'
  | 'alto_corto'
  | 'alto_largo'
  | 'cima_cerca'
  | 'descenso_meta'
  | 'valle'
  | 'sector_meta'

export interface Motif {
  kind: MotifKind
  km: number // total del motivo; en `circuito`, el de una vuelta
  g?: number // dificultades y `tendida`: pendiente media en %
  forma?: 'regular' | 'progresiva' | 'irregular'
  adoquin?: boolean // `muro` adoquinado (sigue siendo `puerto`) o `sector` de adoquín (frente a tierra)
  firme?: 'adoquin' | 'tierra' // solo `sector`; tierra se rinde como `paves` 2-3★
  estrellas?: number // solo `sector`: 1..5
  hijos?: Motif[] // `cadena`, `racimo`, `circuito`: SOLO dificultades, nunca enlaces
  separaciones?: number[] // km de enlace interno: hijos.length − 1 en `cadena` y `racimo`; hijos.length en `circuito`
  vueltas?: number // solo `circuito`
  meta?: MetaKind // solo `meta`
  cotaFinal?: { km: number; g: number } // `meta` con cota
  firma?: boolean // motivo de FIRMA: no cambia entre ediciones
  nombre?: string // texto para la ficha ("Muro de 1,2 km al 11 %")
}

/** Fábrica de corrientes de azar por subflujo nominal, al estilo de `stageRng` (stage/rng.ts l. 26-29). */
export type RngFactory = (sub: string) => () => number

/** Un motivo instanciado y el hueco del que sale (índice en `sk.slots`, o 'meta'): `colocar` lo necesita para la ventana y `Motif` no lo lleva. */
export interface Instancia {
  slot: number | 'meta'
  j: number
  motif: Motif
}
