/**
 * LO QUE EL MOTOR EXPORTA PARA LA RETRANSMISIÓN (E2, docs/retransmision.md §15.5, 6-o, 17-j y 4-p;
 * paso 4a).
 *
 * La pantalla de la retransmisión vive en `packages/shared`, que no importa el motor, así que copia
 * en `BROADCAST` las reglas del motor que necesita, y un test de `apps/api` (`broadcastConstants.
 * test.ts`, que nace en el paso 3a) ata cada copia a su original importándolo de `@cyclingstar/engine`.
 * Este fichero fija la mitad del motor: que esos originales salen por el índice y son los que el
 * motor usa de verdad. Y que el índice ya no exporta las noticias, que se guardan como datos y las
 * redacta `shared` al leer desde el paso 1a.
 */
import { describe, expect, it } from 'vitest'
import * as engine from './index.js'
import { NAME_WHOLE_GROUP_UP_TO, radioForStorage, radioKmFrom } from './sim/raceRadio.js'
import { chaseReferenceIndex } from './stage/group.js'
import { threeKmRule } from './stage/truce.js'
import type { SnapshotRider } from './stage/types.js'

/** Un corredor en un grupo, sin tirar: lo mínimo que pide una foto de la radio. */
const enGrupo = (riderId: string, tS: number): SnapshotRider => ({
  riderId,
  groupId: 'mov-1',
  tS,
  energy: 500,
  energy0: 1000,
  pulling: false,
  pullMotive: null,
  pullFor: null,
  pullWindow: 0,
})

/** A cuántos nombra la radio guardada en un grupo de `n`, sin nadie tirando ni a quien vigilar. */
function nombrados(n: number): number {
  const foto = (km: number, tS: number) =>
    radioKmFrom(
      km,
      Array.from({ length: n }, (_, i) => enGrupo(`r-${i}`, tS)),
      n,
    )
  const guardada = radioForStorage(
    { starters: n, kms: [foto(10, 1000), foto(11, 1080)] },
    new Set(),
  )
  return guardada.kms[0]!.groups[0]!.watching.length
}

describe('el motor exporta lo que la retransmisión copia o cita (E2 §15.5, 17-j)', () => {
  it('chaseReferenceIndex y threeKmRule salen por el índice, y son las del motor', () => {
    expect(engine.chaseReferenceIndex).toBe(chaseReferenceIndex)
    expect(engine.threeKmRule).toBe(threeKmRule)
  })

  it('NAME_WHOLE_GROUP_UP_TO sale por el índice y es el umbral con que la radio nombra al grupo entero', () => {
    expect(engine.NAME_WHOLE_GROUP_UP_TO).toBe(NAME_WHOLE_GROUP_UP_TO)
    expect(engine.NAME_WHOLE_GROUP_UP_TO).toBe(12)
    // Es el corte de `radioForStorage`, no un número suelto: con ese tamaño se nombra a todos, y con
    // uno más, a nadie que no haya que vigilar.
    expect(nombrados(NAME_WHOLE_GROUP_UP_TO)).toBe(NAME_WHOLE_GROUP_UP_TO)
    expect(nombrados(NAME_WHOLE_GROUP_UP_TO + 1)).toBe(0)
  })

  it('las noticias ya no se redactan en el motor (4-p)', () => {
    expect('renderNews' in engine).toBe(false)
  })
})
