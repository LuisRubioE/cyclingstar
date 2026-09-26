/**
 * MOTIVOS DE LA GRAMÁTICA DE RECORRIDOS (docs/generador.md §3.2).
 *
 * Paso 0: solo nace `MetaKind`, porque `RouteStats` del censo (`sim/routeCensus.ts`) la cita. El
 * paso 1 añade aquí el resto de tipos de la sección 3 (`MotifKind`, `Motif`, `RngFactory`,
 * `Instancia`) y el 3 las funciones.
 */

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
