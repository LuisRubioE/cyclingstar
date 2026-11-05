/**
 * LO QUE LA WEB LEE DEL MOTOR, COPIADO Y ATADO POR TEST (E2, paso 10b, los arreglos; docs/retransmision.md
 * §15.5 y §18.5, D-56).
 *
 * `@cyclingstar/engine` no declara `sideEffects`, así que una página de la web que importara de él una
 * sola constante lo cargaba entero, con el calendario que se genera al cargar: medido en el 10b, 354 kB y
 * una tarea de 2,6 s con la CPU a ×4 antes de la primera pintura de `Watch` (umbral, 2 s). La web lee de
 * aquí lo poco que necesita: las dos constantes del diario (`stageJournal.ts`) y el techo de cerillos de la
 * ficha (`maxMatchCount`). Hasta el 19b de E3 leía también la condición del corredor, las dos barras y los
 * cerillos del día, con los números internos del diario; desde entonces la cuenta la API con las funciones
 * del motor y cruza ya en su forma (docs/visual.md §13.5; `apps/api/src/screenShape.ts`). Son COPIAS, como
 * las de `BROADCAST` (§15.5): el valor de verdad sigue en `packages/engine/src/constants.ts` y en
 * `stage/physics.ts`, con su comentario de intención, y `apps/api/src/engineCopies.test.ts` comprueba que
 * cada campo y cada función dan lo mismo que los del motor, al bit. Un cambio en el motor que no se copie
 * aquí rompe ese test, no una carrera. El motor no las lee: no cambian nada de lo que corre.
 */

/** Los campos de `STAGE` que lee la web (el diario y el techo de cerillos). */
export const ENGINE_STAGE = {
  /** el grupo de cabeza deja de ser «un pelotón» y la crónica nombra a los que van delante */
  frontNamesMaxRiders: 8,
  /** el boquete mínimo para contar la ventaja de cabeza en el diario */
  gapReportMinSeconds: 20,
  matchBase: 2,
  matchThresholds: [55, 72, 88],
} as const

/** El techo de cerillos (`maxMatchCount` de `stage/physics.ts`): la base más los umbrales. */
export function maxMatchCount(): number {
  return ENGINE_STAGE.matchBase + ENGINE_STAGE.matchThresholds.length
}
