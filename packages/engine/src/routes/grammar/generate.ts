/**
 * PETICIÓN Y SALIDA DE `generateStage` (docs/generador.md §3.7).
 *
 * Paso 0: solo nace `RouteSource`, porque `RouteStats` del censo la cita y el censo ya filtra por
 * origen. El paso 1 añade el resto de tipos y el 5 `generateStage`.
 */

/** De dónde sale el recorrido de UNA etapa: rasgos reales, edición real sin rasgos o inventado. */
export type RouteSource = 'real' | 'edicion' | 'generado'
