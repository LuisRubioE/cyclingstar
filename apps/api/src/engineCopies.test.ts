import { STAGE, maxMatchCount as engineMaxMatchCount } from '@cyclingstar/engine'
import { ENGINE_STAGE, maxMatchCount } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'

/**
 * LO QUE LA WEB LEE DEL MOTOR, COPIADO EN SHARED (E2, paso 10b, los arreglos; docs/retransmision.md
 * §15.5 y §18.5). La web importaba `@cyclingstar/engine` para dos constantes del diario y para la
 * condición del corredor, y como el motor no declara `sideEffects`, cualquier página que lo tocara lo
 * cargaba ENTERO (el calendario se genera al cargar): 2,6 s de una sola tarea con la CPU a ×4 en la
 * primera pintura de `Watch`. Ahora la web lee la copia de `packages/shared`, y este fichero es lo único
 * que impide que diverja: una copia distinta compila y no rompe ningún banco, pero la crónica diría
 * «cinco en cabeza» con otro umbral que el motor, o la ficha contaría los cerillos sobre otro techo que el
 * de la etapa. Como `broadcastConstants.test.ts`, compara valores, campo a campo.
 *
 * Desde el 19b de E3 la condición y los cerillos del día los cuenta la API con las funciones del motor
 * (docs/visual.md §13.5): sus copias salieron de `shared`, y su prueba es `screenShape.test.ts`.
 */
describe('las copias del motor que lee la web (engineCopies.ts)', () => {
  it('ENGINE_STAGE es el del motor, campo a campo', () => {
    for (const [k, v] of Object.entries(ENGINE_STAGE))
      expect(v, k).toEqual((STAGE as Readonly<Record<string, unknown>>)[k])
  })

  it('maxMatchCount da lo mismo que el motor', () => {
    expect(maxMatchCount()).toBe(engineMaxMatchCount())
  })
})
