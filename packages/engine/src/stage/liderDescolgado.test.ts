import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { simulateStage } from './simulate.js'
import { stageSeed } from './rng.js'
import { conGeneral } from '../sim/generalBench.js'
import { teamedField } from '../sim/tactics.js'
import { queenScenario } from '../sim/scenarios.js'

/**
 * CUANDO EL LÍDER PIERDE LA RUEDA, LA CRÓNICA LO CUENTA (v81, corrección de producción).
 *
 * El dueño, con la captura delante —el maillot amarillo descolgado a 1:43 y tres compañeros suyos
 * tirando para devolverlo—: «el Journal es incoherente… y **no explica por qué se quedó el líder**».
 *
 * Y era literal. `peloton_split` nombra a QUIEN APRIETA y cuenta CUÁNTOS se quedan, pero no nombra a
 * ninguno de los descolgados: el maillot podía perder la carrera sin una sola frase en el diario.
 * La radio lo enseñaba —el grupo se llama «Race leader's group»— y el diario callaba.
 *
 * El aviso vive en `dropOut`, que es la puerta ÚNICA por la que pasan las TRES vías de descuelgue —la
 * criba, el que se deja ir y el que se va al suelo—. Eso es lo que hace imposible que una se escape,
 * y es la misma razón por la que la v26 puso ahí la cuenta de descolgados.
 */
describe('el líder descolgado sale en la crónica', () => {
  const campo = conGeneral(teamedField({ teams: 8, per: 5, kind: 'reina', strong: 4 }), 60)
  const maillot = campo[0]!.riderId
  const corridas = Array.from({ length: 8 }, (_, i) =>
    simulateStage(
      {
        profile: queenScenario().input.profile,
        riders: campo,
        race: { stageDay: 15, totalStages: 21 },
      },
      stageSeed({ worldSeed: `lider-${i}`, raceId: 'lid', stageDay: 15, engineVersion: 1 }),
    ),
  )
  const avisos = (out: (typeof corridas)[number]) =>
    out.events.filter((e) => e.plantilla === 'leader_dropped')

  it('EL CASO EXISTE: en una reina con general, el maillot se suelta alguna vez', () => {
    // El control del control, y no es adorno: si el maillot no se soltara nunca en estas ocho
    // etapas, las tres pruebas de abajo pasarían sin mirar nada. Es el error que esta sesión ha
    // cazado siete veces —una medida que no puede ver lo que dice medir—.
    const conAviso = corridas.filter((o) => avisos(o).length > 0).length
    expect(conAviso).toBeGreaterThan(0)
  })

  it('y el aviso NOMBRA al líder, no a quien aprieta', () => {
    for (const out of corridas) {
      for (const e of avisos(out)) {
        expect(e.protagonistas).toEqual([maillot])
      }
    }
  })

  it('…y trae el PORQUÉ: depósito, terreno y lo que falta', () => {
    for (const out of corridas) {
      for (const e of avisos(out)) {
        const d = Number(e.datos!.deposito)
        expect(Number.isFinite(d)).toBe(true)
        expect(d).toBeGreaterThanOrEqual(0)
        expect(d).toBeLessThanOrEqual(100)
        expect(String(e.datos!.terreno)).not.toBe('')
        expect(Number(e.datos!.toGo)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('no se convierte en letanía: dos avisos no caen encima', () => {
    // El maillot puede soltarse, volver y soltarse otra vez en la misma rampa. Contarlo cada vez
    // convertiría la noticia del día en una lista.
    for (const out of corridas) {
      const kms = avisos(out).map((e) => e.km)
      for (let i = 1; i < kms.length; i++) {
        expect(kms[i]! - kms[i - 1]!).toBeGreaterThanOrEqual(STAGE.leaderDropKmGap)
      }
    }
  })

  it('sin general en juego no hay maillot que descolgar, y no se dice nada', () => {
    // La garantía que impide que esto hable en una clásica: sin `race` ni déficits, `hasGcContext`
    // es `false` y el aviso no existe.
    const sinGeneral = simulateStage(
      {
        profile: queenScenario().input.profile,
        riders: campo.map((r) => ({ ...r, gcDeficitSeconds: 0 })),
      },
      stageSeed({ worldSeed: 'sin-gc', raceId: 'lid', stageDay: 1, engineVersion: 1 }),
    )
    expect(sinGeneral.events.filter((e) => e.plantilla === 'leader_dropped')).toHaveLength(0)
  })
})
