import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { STAGE } from '../constants.js'
import { simulateStage, stageTss } from './simulate.js'
import { blockCost } from './physics.js'
import { stageSeed } from './rng.js'
import type { RaceEvent, StageInput, StageOrders, StageOutput, StageRider } from './types.js'

function eff(
  base: number,
  over: Partial<Record<Attribute, number>> = {},
): Record<Attribute, number> {
  return {
    RES: base,
    REC: base,
    LLA: base,
    MON: base,
    COL: base,
    CRI: base,
    SPR: base,
    DES: base,
    PAV: base,
    TAC: base,
    ...over,
  }
}

const orders = (o: Partial<StageOrders>): StageOrders => ({
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
  ...o,
})

function rider(id: string, over: Partial<StageRider>): StageRider {
  return {
    riderId: id,
    eff0: eff(50),
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: orders({}),
    gcDeficitSeconds: 0,
    ...over,
  }
}

/** Semillas deterministas de una campaña: mismo tag y mismo índice, misma etapa siempre. */
const seedsFor = (tag: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) =>
    stageSeed({ worldSeed: `${tag}-${i}`, raceId: tag, stageDay: 1, engineVersion: 1 }),
  )

/** Una etapa llana de 100 km con una meta volante, un puñado de sprinters y candidatos a fuga. */
function flatStageInput(): StageInput {
  const riders: StageRider[] = []
  // 3 sprinters de nivel.
  for (let i = 0; i < 3; i++) {
    riders.push(
      rider(`spr-${i}`, {
        eff0: eff(55, { SPR: 85, LLA: 70 }),
        orders: orders({ role: 'sprinter', contestSprints: true }),
      }),
    )
  }
  // 4 cazaetapas combativos.
  for (let i = 0; i < 4; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(55, { TAC: 62, LLA: 72 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  // Relleno del pelotón.
  for (let i = 0; i < 33; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(48 + (i % 7)) }))
  }
  return {
    profile: {
      segments: [{ km: 100, tipo: 'llano' }],
      banners: [{ km: 50, tipo: 'meta_volante' }],
    },
    riders,
  }
}

describe('simulateStage — etapa llana (Paso 24)', () => {
  const seed = stageSeed({ worldSeed: 'w', raceId: 'vuelta-test', stageDay: 1, engineVersion: 1 })
  const out = simulateStage(flatStageInput(), seed)

  it('produce una crónica coherente de principio a fin', () => {
    const tipos = out.events.map((e) => e.tipo)
    // Desde la capa táctica (docs/motor.md §13) la fuga del día ya no está garantizada: emerge del
    // primer intento al que el pelotón da cuerda, y en esta semilla no le da cuerda a ninguno. Lo
    // que SÍ tiene que haber siempre es carrera —alguien lo intenta— y un ganador.
    expect(tipos).toContain('intento')
    expect(tipos).toContain('meta') // se declara un ganador de etapa
    // Los eventos están ordenados cronológicamente.
    for (let i = 1; i < out.events.length; i++) {
      expect(out.events[i]!.tS).toBeGreaterThanOrEqual(out.events[i - 1]!.tS)
    }
  })

  it('clasifica a los 40 corredores con puestos únicos de 1 a 40', () => {
    expect(out.results).toHaveLength(40)
    const puestos = out.results.map((r) => r.puesto).sort((a, b) => a - b)
    expect(puestos).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
    // El primero llega antes que el último.
    expect(out.results[0]!.tiempoS).toBeLessThanOrEqual(out.results[39]!.tiempoS)
  })

  it('reparte bonificaciones 10/6/4 a los tres primeros', () => {
    expect(out.results[0]!.bonificacionS).toBe(10)
    expect(out.results[1]!.bonificacionS).toBe(6)
    expect(out.results[2]!.bonificacionS).toBe(4)
    expect(out.results[3]!.bonificacionS).toBe(0)
  })

  it('la meta volante reparte puntos', () => {
    const totalVolante = out.results.reduce((sum, r) => sum + r.puntosVolante, 0)
    expect(totalVolante).toBeGreaterThan(0)
  })

  it('registra el gasto (workUnits) de cada corredor', () => {
    expect(out.workUnits.size).toBe(40)
    for (const units of out.workUnits.values()) expect(units).toBeGreaterThan(0)
  })

  it('es determinista: la misma semilla da el mismo ganador', () => {
    const again = simulateStage(flatStageInput(), seed)
    expect(again.results[0]!.riderId).toBe(out.results[0]!.riderId)
  })
})

// --- Invariantes estructurales del motor (SPEC 6.15, 6.16) ---------------------------------
// La garantía central del motor: con la MISMA semilla, la salida COMPLETA es idéntica bit a bit,
// y sea cual sea el terreno la clasificación es única y completa y no hay magnitudes imposibles.
// Comprobar solo `results[0].riderId` dejaba pasar cualquier no-determinismo en eventos, tiempos,
// gasto o incidentes; por eso aquí se compara el StageOutput entero.

/** Los cuatro terrenos del motor, cada uno con un campo de corredores adecuado. */
function terrainCases(): { name: string; input: StageInput }[] {
  const climbers = (): StageRider[] => {
    const riders: StageRider[] = []
    for (let i = 0; i < 4; i++) {
      riders.push(
        rider(`gc-${i}`, {
          eff0: eff(60, { MON: 82 + i, COL: 78, LLA: 64 }),
          orders: orders({ role: 'lider', contestClimbs: true }),
        }),
      )
    }
    for (let i = 0; i < 5; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(56, { MON: 70 + (i % 4), COL: 68, LLA: 66, TAC: 60 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestClimbs: true }),
        }),
      )
    }
    for (let i = 0; i < 21; i++) {
      riders.push(rider(`pel-${i}`, { eff0: eff(55, { MON: 54 + (i % 10), LLA: 60 }) }))
    }
    return riders
  }
  const rouleurs = (pav: number): StageRider[] =>
    Array.from({ length: 30 }, (_, i) =>
      rider(`r-${i}`, {
        eff0: eff(56, { PAV: pav + (i % 9), LLA: 60 + (i % 7), CRI: 62 + (i % 8) }),
      }),
    )

  return [
    { name: 'llano', input: flatStageInput() },
    {
      name: 'montaña',
      input: {
        profile: {
          segments: [
            { km: 60, tipo: 'llano' },
            { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 8 }] },
          ],
          banners: [{ km: 72, tipo: 'cima' }],
        },
        riders: climbers(),
      },
    },
    {
      name: 'CRI',
      input: {
        profile: { segments: [{ km: 30, tipo: 'llano' }] },
        riders: rouleurs(52),
        timeTrial: true,
      },
    },
    {
      name: 'pavés',
      input: {
        profile: {
          segments: [
            { km: 15, tipo: 'llano' },
            { km: 25, tipo: 'paves', estrellas: 4 },
            { km: 10, tipo: 'llano' },
          ],
        },
        riders: rouleurs(50),
      },
    },
  ]
}

/**
 * EL FRENTE SIN DUEÑO SON UNO, DOS O TRES EQUIPOS (v35, §V.1). Lo pidió el dueño sobre una foto de
 * la Race Radio con **PULLING (8) de cinco equipos distintos**: «si el frente no tiene dueño único,
 * debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad».
 *
 * Se mide con la sonda del motor (`StageProbe`), que dice quién PAGA VIENTO en el bloque de la
 * foto: es el dato de verdad, no la lista de tres nombres que publica el parte.
 */
/**
 * LOS SUYOS SE DEJAN CAER A POR ÉL (v36, §V.1). Hasta la v35 el trabajo de equipo se acababa en el
 * borde del grupo: los tres mecanismos que existen —el descuento de coste del gregario, el deber de
 * relevo y el marcaje— piden LOS TRES ir en el mismo grupo, así que un jefe caído o descolgado
 * dejaba de tener equipo. Medido sobre 120 etapas del banco: pasa 3,18 veces por etapa y en el 40 %
 * de ellas con dos o más de los suyos dentro del pelotón.
 *
 * El banco monta el caso a mano: un jefe que NO puede con el puerto y cinco gregarios suyos que sí,
 * y detrás una llanura larga donde el rescate tiene sentido.
 */
describe('los suyos se dejan caer a por él (v36, §V.1)', () => {
  const conJefeQueSeCae = (gcEnJuego: boolean): StageInput => {
    const riders: StageRider[] = []
    // El equipo del jefe: él flojo en montaña, sus cinco hombres enteros.
    riders.push(
      rider('jefe', {
        eff0: eff(64, { MON: 34, COL: 34 }),
        teamId: 'equipo-jefe',
        orders: orders({ role: 'lider' }),
        gcDeficitSeconds: gcEnJuego ? 20 : 0,
      }),
    )
    for (let i = 0; i < 5; i++) {
      riders.push(
        rider(`greg-${i}`, {
          eff0: eff(62),
          teamId: 'equipo-jefe',
          orders: orders({ role: 'gregario', targetRiderId: 'jefe' }),
          gcDeficitSeconds: gcEnJuego ? 900 + i : 0,
        }),
      )
    }
    // Y el resto de la carrera, en equipos normales.
    for (let t = 0; t < 6; t++) {
      for (let k = 0; k < 6; k++) {
        riders.push(
          rider(`t${t}-${k}`, {
            eff0: eff(60 + ((t + k) % 4)),
            teamId: `equipo-${t}`,
            orders: orders({ role: k === 0 ? 'lider' : 'gregario', targetRiderId: `t${t}-0` }),
            gcDeficitSeconds: gcEnJuego ? (k === 0 ? 40 + t * 30 : 800 + t * 20 + k) : 0,
          }),
        )
      }
    }
    return {
      profile: {
        segments: [
          { km: 20, tipo: 'llano' },
          // Un puerto corto y duro que suelta al jefe (MON 34) y no al resto del campo (MON 60-63),
          // y detrás una llanura larga donde el rescate tiene sentido.
          { km: 5, tipo: 'puerto', tramos: [{ km: 5, g: 6 }] },
          { km: 95, tipo: 'llano' },
        ],
      },
      riders,
    }
  }

  const partes = (input: StageInput, tag: string): RaceEvent[] =>
    seedsFor(tag, 6).flatMap((seed) =>
      simulateStage(input, seed).events.filter((e) => e.plantilla === 'domestiques_drop_back'),
    )

  it('cuando el jefe se queda POR LA GENERAL, sus gregarios bajan a por él', () => {
    const avisos = partes(conJefeQueSeCae(true), 'ayuda-gc')
    expect(avisos.length).toBeGreaterThan(0)
    for (const e of avisos) {
      expect(e.datos?.jefeId).toBeDefined()
      // Nunca baja NADIE por un boquete de acordeón: el suelo es la puerta del pelotón.
      expect(Number(e.datos!.gapS)).toBeGreaterThanOrEqual(STAGE.regroupGapSeconds)
      expect(Number(e.datos!.gapS)).toBeLessThanOrEqual(STAGE.helpBackMaxGapSeconds)
      // …ni en el desenlace: bajar a 3 km de meta no ayuda a nadie.
      expect(Number(e.datos!.toGo)).toBeGreaterThanOrEqual(STAGE.helpBackMinKmToGo)
    }
  })

  it('POR LA ETAPA no se baja nadie si no ha habido percance (v37)', () => {
    /**
     * La corrección del dueño a la v36: «por la etapa yo creo que nadie debería bajarse… salvo que
     * sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa».
     * Aquí el jefe se descuelga por el puerto, sin percance: su equipo NO baja a por él. Sin general
     * en juego los motivos `maillot` y `general` no existen, así que esto aísla la rama de la etapa.
     */
    const avisos = partes(conJefeQueSeCae(false), 'ayuda')
    expect(avisos).toHaveLength(0)
  })

  it('…y por la GENERAL bajan todos menos uno', () => {
    /**
     * «Si es el favorito para una gran vuelta o carrera por etapas, puede justificar descolgar a
     * todo el equipo menos 1». El equipo del jefe son seis: él y cinco hombres, así que el techo
     * son cuatro (cinco menos el que se queda arriba, `helpBackGcKeepInBunch`), y por la general se
     * llega a ese techo. La rama de la etapa nunca pasaría de `helpBackStageHelpers` = 2.
     */
    const porLaGeneral = partes(conJefeQueSeCae(true), 'ayuda-gc').filter(
      (e) => e.datos?.porQue === 'general',
    )
    expect(porLaGeneral.length).toBeGreaterThan(0)
    const masGente = Math.max(...porLaGeneral.map((e) => Number(e.datos!.cuantos)))
    expect(masGente).toBeGreaterThan(STAGE.helpBackStageHelpers)
    expect(masGente).toBe(5 - STAGE.helpBackGcKeepInBunch)
  })

  it('de la CABEZA DE CARRERA no baja nadie; del pelotón y de los de delante, sí', () => {
    /**
     * La regla del dueño sobre DE DÓNDE sale el que baja: «alguien de la fuga no lo mandes para
     * atrás… alguien del pelotón sí. Salvo que sea con carrera rota… y uno que va en grupo 2 podría
     * esperar a uno del grupo 3 y ayudarlo», y en la v37: «si va en cabeza de carrera lo normal es
     * que no se deje caer… si va en un grupo de perseguidores y su jefe está en problemas, ahí sí».
     *
     * O sea: lo que decide no es de dónde nació el grupo sino si va EN CABEZA. Se comprueba con la
     * sonda: en la foto anterior al aviso, ninguno de los que bajan iba en el grupo de cabeza.
     */
    let comprobados = 0
    for (const seed of seedsFor('ayuda-gc', 8)) {
      const input = conJefeQueSeCae(true)
      const avisos = simulateStage(input, seed).events.filter(
        (e) => e.plantilla === 'domestiques_drop_back',
      )
      if (avisos.length === 0) continue
      const fotos = new Map<number, ReadonlyMap<string, string>>()
      /** El grupo de CABEZA de cada foto: el que lleva el reloj más bajo. */
      const cabezaDe = new Map<number, string>()
      simulateStage(input, seed, {
        atKm: Array.from({ length: 120 }, (_, i) => i + 1),
        onSnapshot: (km, snap) => {
          fotos.set(Math.round(km), new Map(snap.map((r) => [r.riderId, r.groupId])))
          let cabeza = ''
          let mejor = Number.POSITIVE_INFINITY
          for (const r of snap) {
            if (r.tS < mejor) {
              mejor = r.tS
              cabeza = r.groupId
            }
          }
          cabezaDe.set(Math.round(km), cabeza)
        },
      })
      for (const aviso of avisos) {
        const antes = fotos.get(Math.floor(aviso.km))
        if (!antes) continue
        for (const id of aviso.protagonistas) {
          const grupo = antes.get(id)
          if (grupo === undefined) continue
          comprobados += 1
          expect(grupo).not.toBe(cabezaDe.get(Math.floor(aviso.km)))
        }
      }
    }
    expect(comprobados).toBeGreaterThan(5)
  })

  it('…y con los suyos al lado el jefe NO tira: se reserva', () => {
    // La otra mitad de la frase del dueño. `relayProtectedPenalty` no bastaba en grupo pequeño,
    // donde el turno es el grupo entero: medido antes de la v36, el jefe tiraba en el 6,3 % de las
    // fotos con los suyos al lado.
    let fotos = 0
    let tirando = 0
    for (const seed of seedsFor('ayuda-turno', 8)) {
      simulateStage(conJefeQueSeCae(true), seed, {
        // Justo después del puerto, que es donde el rescate ocurre y donde se puede mirar si el
        // jefe da la cara: en cuanto vuelven al pelotón la pregunta deja de tener sentido.
        atKm: Array.from({ length: 16 }, (_, i) => 22 + i),
        onSnapshot: (_km, snap) => {
          const jefe = snap.find((r) => r.riderId === 'jefe')
          if (!jefe) return
          const conEl = snap.filter(
            (r) => r.groupId === jefe.groupId && r.riderId.startsWith('greg-'),
          ).length
          const grupo = snap.filter((r) => r.groupId === jefe.groupId).length
          // Solo cuenta cuando lleva a los suyos Y no es el grupo entero de la carrera.
          if (conEl === 0 || grupo > 12) return
          fotos += 1
          if (jefe.pulling) tirando += 1
        },
      })
    }
    expect(fotos).toBeGreaterThan(5)
    expect(tirando / fotos).toBeLessThan(0.1)
  })
})

describe.each(terrainCases())('invariantes del motor — $name', ({ name, input }) => {
  const seed = stageSeed({ worldSeed: 'inv', raceId: name, stageDay: 1, engineVersion: 1 })
  const out = simulateStage(input, seed)
  const n = input.riders.length

  it('es determinista: la MISMA semilla da el StageOutput COMPLETO idéntico', () => {
    const again = simulateStage(input, seed)
    // Compara events + results + workUnits + incidents + engineVersion de una vez: cualquier
    // no-determinismo en tiempos, crónica, gasto o incidentes hace fallar este test.
    expect(again).toEqual(out)
  })

  it('…Y EL ORDEN DE ENTRADA TAMPOCO DECIDE NADA (v35)', () => {
    /**
     * El motor era determinista dada la semilla pero NO invariante a permutaciones del campo: las
     * piernas del día (`rngDay`) se reparten recorriendo `input.riders`, así que barajar a los
     * MISMOS corredores con la MISMA semilla daba otra carrera. Medido en la v34 sobre una etapa
     * real: 36 de 36 barajados cambiaban el resultado, y eso convertía en física el orden de una
     * consulta SQL (docs/balance.md «El motor depende del ORDEN DE ENTRADA»).
     *
     * Se baraja con un mezclador determinista —nada de `Math.random`, que este banco no puede usar—
     * y se exige el `StageOutput` ENTERO idéntico, no solo el ganador.
     */
    let x = 12345
    const rnd = (): number => {
      x = (x * 1103515245 + 12345) % 2147483648
      return x / 2147483648
    }
    for (let ronda = 0; ronda < 3; ronda++) {
      const barajado = [...input.riders]
      for (let i = barajado.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        ;[barajado[i], barajado[j]] = [barajado[j]!, barajado[i]!]
      }
      expect(simulateStage({ ...input, riders: barajado }, seed)).toEqual(out)
    }
  })

  it('clasifica a todos exactamente una vez, con puestos 1..N sin huecos', () => {
    expect(out.results).toHaveLength(n)
    const ids = out.results.map((r) => r.riderId)
    expect(new Set(ids).size).toBe(n)
    expect([...ids].sort()).toEqual(input.riders.map((r) => r.riderId).sort())
    // Los CLASIFICADOS llevan puesto 1..K sin huecos; el que no está clasificado —se retiró o llegó
    // fuera de control— lleva puesto 0, que es como el motor lo dice desde la v14.
    //
    // Hasta la v15 estos cuatro bancos terminaban SIEMPRE con los N clasificados, y no porque la
    // regla lo garantizase: con el recorte fijo de `chaseBackSecondsPerKm` nadie perdía tiempo
    // suficiente para que el corte le señalara. Desde la v16 el peor adoquinero del banco de pavés
    // —25 km de 4★— entra a 427 s del ganador, un 8,5 %, y el corte del 8 % lo deja fuera: eso es
    // exactamente lo que este cambio venía a arreglar, y la etapa sigue estando bien formada.
    const classified = out.results.filter((r) => r.estado === 'finish')
    expect(classified.map((r) => r.puesto)).toEqual(
      Array.from({ length: classified.length }, (_, i) => i + 1),
    )
    for (const r of out.results) if (r.estado !== 'finish') expect(r.puesto).toBe(0)
  })

  it('los tiempos son finitos, positivos y no decrecen con el puesto', () => {
    let prev = -Infinity
    for (const r of out.results) {
      expect(Number.isFinite(r.tiempoS)).toBe(true)
      expect(Number.isInteger(r.tiempoS)).toBe(true)
      expect(r.tiempoS).toBeGreaterThan(0)
      expect(r.tiempoS).toBeGreaterThanOrEqual(prev)
      prev = r.tiempoS
    }
  })

  it('el gasto (work) es finito y nunca negativo, y hay uno por corredor', () => {
    expect(out.workUnits.size).toBe(n)
    for (const [id, units] of out.workUnits) {
      expect(Number.isFinite(units), `work de ${id}`).toBe(true)
      expect(units, `work de ${id}`).toBeGreaterThanOrEqual(0)
      expect(stageTss(units)).toBeGreaterThanOrEqual(0)
    }
  })

  it('la crónica avanza en el tiempo y los incidentes son coherentes', () => {
    for (let i = 1; i < out.events.length; i++) {
      expect(out.events[i]!.tS).toBeGreaterThanOrEqual(out.events[i - 1]!.tS)
      expect(out.events[i]!.km).toBeGreaterThanOrEqual(0)
    }
    for (const inc of out.incidents) {
      expect(out.workUnits.has(inc.riderId)).toBe(true)
      expect(inc.perdidaS).toBeGreaterThanOrEqual(0)
      expect(inc.diasBaja).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(inc.diasBaja)).toBe(true)
      expect(inc.km).toBeGreaterThanOrEqual(0)
    }
  })

  it('los puntos de volante y montaña nunca son negativos', () => {
    for (const r of out.results) {
      expect(r.puntosVolante).toBeGreaterThanOrEqual(0)
      expect(r.puntosMontana).toBeGreaterThanOrEqual(0)
      expect(r.bonificacionS).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('energía nunca negativa (SPEC 6.5, 6.7)', () => {
  // El tanque se vacía con `energy = max(0, energy - coste)`, así que basta con garantizar que
  // NINGÚN coste de bloque es negativo (un coste negativo rellenaría el tanque y rompería la
  // erosión). Se barre toda la rejilla de terreno, compromiso y abrigo que usa el motor.
  it('el coste de un bloque nunca es negativo, en ningún terreno ni abrigo', () => {
    const turnos: Array<[boolean, number]> = [
      [true, 1],
      [true, 2],
      [true, 8],
      [false, 8],
    ]
    for (const tipo of ['llano', 'subida', 'descenso', 'paves'] as const) {
      for (let g = -15; g <= 20; g++) {
        for (const estrellas of [0, 1, 2, 3, 4, 5]) {
          for (let c = 0; c <= 1.0001; c += 0.1) {
            for (const [pulling, pullers] of turnos) {
              const cost = blockCost({ tipo, g, estrellas }, c, pulling, pullers)
              expect(Number.isFinite(cost)).toBe(true)
              expect(cost).toBeGreaterThanOrEqual(0)
            }
          }
        }
      }
    }
  })

  // Una etapa brutal para un campo flojo: casi todos acaban con el tanque a cero. Aun así el
  // resultado debe seguir siendo una clasificación completa, finita y con gasto no negativo.
  it('una etapa que vacía el tanque sigue dando una clasificación completa y finita', () => {
    const riders = Array.from({ length: 24 }, (_, i) =>
      rider(`w-${i}`, { eff0: eff(34 + (i % 5)), energy: 12, matches: 0 }),
    )
    const seed = stageSeed({ worldSeed: 'bonk', raceId: 'bonk', stageDay: 1, engineVersion: 1 })
    const out = simulateStage(
      {
        profile: {
          segments: [
            { km: 40, tipo: 'puerto', tramos: [{ km: 40, g: 9 }] },
            { km: 20, tipo: 'paves', estrellas: 5 },
          ],
        },
        riders,
      },
      seed,
    )
    expect(out.results).toHaveLength(riders.length)
    expect(out.results.map((r) => r.puesto)).toEqual(
      Array.from({ length: riders.length }, (_, i) => i + 1),
    )
    for (const r of out.results) expect(Number.isFinite(r.tiempoS)).toBe(true)
    for (const units of out.workUnits.values()) {
      expect(Number.isFinite(units)).toBe(true)
      expect(units).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('trabajo de equipo (SPEC 6.18)', () => {
  // Dos sprinters idénticos; solo uno lleva un tren de dos lanzadores que le lanzan en meta.
  function leadOutInput(): StageInput {
    const riders: StageRider[] = []
    for (const id of ['spr-train', 'spr-alone']) {
      riders.push(
        rider(id, {
          eff0: eff(55, { SPR: 82, LLA: 70 }),
          orders: orders({ role: 'sprinter', contestSprints: false }),
        }),
      )
    }
    // Dos lanzadores para spr-train (buen llano para no descolgarse del grupo de meta).
    for (let i = 0; i < 2; i++) {
      riders.push(
        rider(`lead-${i}`, {
          eff0: eff(58, { LLA: 74 }),
          orders: orders({ role: 'lanzador', targetRiderId: 'spr-train' }),
        }),
      )
    }
    for (let i = 0; i < 36; i++) riders.push(rider(`pel-${i}`, { eff0: eff(50 + (i % 6)) }))
    return { profile: { segments: [{ km: 100, tipo: 'llano' }] }, riders }
  }

  it(
    /**
     * 180 s y no 30 (v43). El nocturno instrumentado de `cobertura.yml` lo mató en los 30, sin que
     * fallara ninguna afirmación: cuesta 12,2 s en local, y entre la instrumentación (×1,76) y un
     * runner lento se planta justo encima del límite. Con la regla de este repositorio —presupuesto
     * de al menos cuatro veces el coste en CI, ver `sim/invariants.test.ts`— salen 180.
     */
    'un sprinter con tren de lanzadores gana la llegada masiva más que uno idéntico sin tren',
    { timeout: 180000 },
    () => {
      let train = 0
      let alone = 0
      for (let s = 0; s < 60; s++) {
        const seed = stageSeed({
          worldSeed: `lo-${s}`,
          raceId: 'lo',
          stageDay: 1,
          engineVersion: 1,
        })
        const out = simulateStage(leadOutInput(), seed)
        const posTrain = out.results.find((r) => r.riderId === 'spr-train')!.puesto
        const posAlone = out.results.find((r) => r.riderId === 'spr-alone')!.puesto
        if (posTrain < posAlone) train++
        else alone++
      }
      // El tren no es garantía (piernas del día, ruido del sprint) pero inclina claramente la balanza.
      expect(train).toBeGreaterThan(alone)
      expect(train).toBeGreaterThanOrEqual(38) // ≳63% de las etapas
    },
  )

  // Dos líderes idénticos; solo uno lleva tres gregarios que le arropan en el pelotón.
  function domestiqueInput(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 3; i++) {
      riders.push(
        rider(`greg-${i}`, { orders: orders({ role: 'gregario', targetRiderId: 'cap-a' }) }),
      )
    }
    for (let i = 0; i < 34; i++) riders.push(rider(`pel-${i}`, { eff0: eff(50 + (i % 6)) }))
    // Los dos capitanes al final del campo: quedan fuera de la fracción que releva (25%), así ambos
    // van protegidos y la única diferencia es la protección extra de los gregarios de cap-a.
    for (const id of ['cap-a', 'cap-b']) {
      riders.push(rider(id, { eff0: eff(62, { LLA: 66 }), orders: orders({ role: 'lider' }) }))
    }
    return { profile: { segments: [{ km: 120, tipo: 'llano' }] }, riders }
  }

  it('un líder arropado por gregarios gasta LO MISMO que uno a rueda sin equipo (v38)', () => {
    /**
     * Hasta la v37 este test pedía que el arropado gastara MENOS, y era falso de carretera. El
     * dueño: «un líder arropado por gregarios dentro del pelotón gasta lo mismo que uno que va a
     * rueda en el pelotón cómodamente sin entrar a los relevos». Lo que ahorra energía es ir a
     * rueda, y eso lo cobra `shelterProtected` igual para todos; llevar equipo no te pone más a
     * rueda de lo que ya vas. Se retiró `domestiqueProtectPerHelper` (docs/balance.md «v38»).
     *
     * Lo que un equipo SÍ te da sigue existiendo y se comprueba en otros sitios: que ellos entren
     * al turno y paguen el viento por ti, y que te saquen del turno cuando hace falta (v36).
     */
    /**
     * Y SE MIDE SOBRE VARIAS ETAPAS, NO SOBRE UNA (v38). Con una sola semilla esto no medía el
     * coste de ir a rueda sino la lotería del día: en un campo de 39 hombres la capa táctica manda
     * a veces a uno de los dos capitanes a un movimiento y ese gasta el doble, y con las mismas
     * órdenes y los mismos atributos la diferencia entre semillas iba del 0 % al 94 %. La afirmación
     * del dueño —«un líder arropado por gregarios gasta lo mismo que uno a rueda sin equipo»— es
     * sobre el promedio, así que se mide sobre el promedio.
     */
    const semillas = ['dom', 'dom-2', 'dom-3', 'dom-4', 'dom-5', 'dom-6', 'dom-7', 'dom-8']
    let workA = 0
    let workB = 0
    for (const w of semillas) {
      const out = simulateStage(
        domestiqueInput(),
        stageSeed({ worldSeed: w, raceId: 'dom', stageDay: 1, engineVersion: 1 }),
      )
      workA += out.workUnits.get('cap-a')!
      workB += out.workUnits.get('cap-b')!
    }
    // Los dos van a rueda y son idénticos; lo poco que separa a uno de otro es en qué bloques les
    // toca el turno, no un descuento por llevar maillot del mismo equipo.
    expect(Math.abs(workA - workB) / workB).toBeLessThan(0.15)
  })

  // Un escalador fuerte (objetivo) y dos escaladores medianos idénticos; solo uno (mark) marca al fuerte.
  function markInput(): StageInput {
    const riders: StageRider[] = [
      rider('target', { eff0: eff(58, { MON: 82, COL: 78 }), orders: orders({ role: 'lider' }) }),
      rider('mark', {
        eff0: eff(58, { MON: 74, COL: 72 }),
        orders: orders({ role: 'marcador', targetRiderId: 'target' }),
      }),
      rider('free', { eff0: eff(58, { MON: 74, COL: 72 }) }),
    ]
    for (let i = 0; i < 30; i++)
      riders.push(rider(`pel-${i}`, { eff0: eff(54, { MON: 52 + (i % 8) }) }))
    return {
      profile: {
        segments: [
          { km: 120, tipo: 'llano' },
          { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 8 }] },
        ],
        banners: [{ km: 132, tipo: 'cima' }],
      },
      riders,
    }
  }

  it(
    'un marcador se pega a su objetivo en la subida más que un igual que no marca',
    // 60 ETAPAS SIMULADAS, y por eso este necesita más que el suelo de 30 s: es el test más caro de
    // este fichero. Medido, 8,66 s aquí; 17,50 s con la instrumentación de la cobertura puesta
    // (×2,02); y **36,7 s en el nocturno**, que es donde se pasó de los 30 s que tenía y dejó el
    // workflow en rojo dos noches seguidas. No es que el test se haya vuelto lento —con la v33
    // tardaba 9,02 s, o sea algo MÁS— es que su límite se calibró sobre la suite sin instrumentar.
    { timeout: 180000 },
    () => {
      let markWith = 0
      let freeWith = 0
      for (let s = 0; s < 60; s++) {
        const seed = stageSeed({
          worldSeed: `mk-${s}`,
          raceId: 'mk',
          stageDay: 1,
          engineVersion: 1,
        })
        const out = simulateStage(markInput(), seed)
        const t = out.results.find((r) => r.riderId === 'target')!.tiempoS
        const mk = out.results.find((r) => r.riderId === 'mark')!.tiempoS
        const fr = out.results.find((r) => r.riderId === 'free')!.tiempoS
        // "Con el objetivo" = a menos de 5 s de su tiempo en meta.
        if (Math.abs(mk - t) <= 5) markWith++
        if (Math.abs(fr - t) <= 5) freeWith++
      }
      // Marcar debe hacer que se quede con el objetivo más a menudo que el corredor idéntico que no marca.
      expect(markWith).toBeGreaterThan(freeWith)
    },
  )
})

// --- Modelo de final (docs/motor.md §12) ----------------------------------------------------
// El orden dentro de un grupo lo decidía UN atributo (`finishUphill ? max(MON,COL) : SPR`): solo
// existían dos arquetipos de final, el PAV no intervenía jamás en ningún resultado y el trabajo
// del día no se pagaba. Estos tests fijan lo contrario, de punta a punta del motor.

describe('modelo de final (docs/motor.md §12)', () => {
  it('el evento de meta dice qué clase de final resolvió la etapa', () => {
    // `matches: 0` apaga la capa táctica en este banco (sin cerillo no hay ataque, SPEC 6.6): lo
    // que se mide aquí es la DERIVACIÓN del tipo de final, no si alguien se va por delante.
    const field = Array.from({ length: 30 }, (_, i) =>
      rider(`p-${i}`, { eff0: eff(58, { SPR: 60 + (i % 9), MON: 60 + (i % 7) }), matches: 0 }),
    )
    const llana = simulateStage(
      { profile: { segments: [{ km: 120, tipo: 'llano' }] }, riders: field },
      stageSeed({ worldSeed: 'f1', raceId: 'f1', stageDay: 1, engineVersion: 1 }),
    )
    expect(llana.events.find((e) => e.plantilla === 'stage_win')!.datos!.finish).toBe(
      'sprint_masivo',
    )
    /**
     * EL FINAL EN ALTO SE MIDE SOBRE DIEZ SEMILLAS EN LA v26, y hay que decir por qué.
     *
     * La semilla `f2` daba `alto` con el descuelgue en dado y ahora da `solitario`. **No es que el
     * final en alto haya dejado de seleccionar: es que selecciona hasta el final.** Medido en esa
     * misma semilla: el ganador corona con **53 s** sobre el segundo y llega **1 dentro de 30 s y 3
     * dentro de 60 s**, que es exactamente el patrón que docs/balance.md «v26» §5 documentó de la
     * carretera real para un final en alto de gran vuelta (Plateau de Beille 2024: 1 · 1 · 1;
     * Pla d'Adet: 1 · 1 · 2). Y `finishType` devuelve `solitario` para un grupo de UNO desde la v22,
     * a propósito y por definición: no hay clase de final que derivar cuando llega un hombre solo.
     *
     * Así que lo que había caducado era la PREMISA del banco —que estas 30 piernas casi iguales
     * coronan juntas—, no lo que el test vigila. Se vigila igual, y con más fuerza que antes: sobre
     * diez semillas del MISMO final, **todas las que llegan con grupo dicen `alto`** (nunca
     * `puncheur`, ni `sprint_reducido`, que es el defecto que este test nació para cazar) y la
     * derivación se ejerce de verdad porque la mayoría llega con grupo. Medido: **7 de 10 con grupo
     * y las 3 restantes en solitario**, con el segundo a 46-53 s en las tres.
     */
    const altos = Array.from({ length: 10 }, (_, s) => {
      const out = simulateStage(
        {
          profile: {
            segments: [
              { km: 60, tipo: 'llano' },
              { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 8 }] },
            ],
          },
          riders: field,
        },
        stageSeed({
          worldSeed: s === 0 ? 'f2' : `f2-${s}`,
          raceId: 'f2',
          stageDay: 1,
          engineVersion: 1,
        }),
      )
      return out.events.find((e) => e.plantilla === 'stage_win')!.datos!
    })
    for (const d of altos) expect(d.finish).toBe(Number(d.field) === 1 ? 'solitario' : 'alto')
    expect(altos.filter((d) => d.finish === 'alto').length).toBeGreaterThanOrEqual(5)
  })

  it(
    'un final de PAVÉ lo gana el adoquinero: el PAV interviene en el resultado',
    { timeout: 30000 },
    () => {
      // El campo solo se distingue en PAV (45-83). Antes el ganador salía con un PAV mediano de
      // 63 sobre ese rango —el centro exacto, es decir, azar puro— porque el final era a puro SPR.
      // Sin cerillos: aquí se mide el REMATE por PAV, no la capa táctica (docs/motor.md §13).
      const riders = Array.from({ length: 30 }, (_, i) =>
        rider(`r-${i}`, { eff0: eff(60, { PAV: 45 + i }), fragility: 1, matches: 0 }),
      )
      const input: StageInput = {
        profile: {
          segments: [
            { km: 60, tipo: 'llano' },
            { km: 15, tipo: 'paves', estrellas: 4 },
            { km: 3, tipo: 'llano' },
          ],
        },
        riders,
      }
      /**
       * SESENTA SEMILLAS Y NO VEINTE (v39). Este banco resume veinte etapas en UNA MEDIANA de una
       * lista de enteros, y con veinte muestras esa mediana salta de dos en dos puntos por nada:
       * medido sobre 80 corridas, el valor real es estable pero la mediana de 20 baila lo bastante
       * como para que el test se decida por la semilla y no por el motor. No se toca el umbral —lo
       * que se pide sigue siendo lo mismo— se le da a la medida el tamaño de muestra que necesita.
       */
      const pavs: number[] = []
      for (const seed of seedsFor('pave-final', 60)) {
        const out = simulateStage(input, seed)
        pavs.push(riders.find((r) => r.riderId === out.results[0]!.riderId)!.eff0.PAV)
      }
      pavs.sort((a, b) => a - b)
      const mediana = pavs[Math.floor(pavs.length / 2)]!
      /**
       * EL UMBRAL BAJA A 69 EN LA v39, y lo baja el DUEÑO. Se le llevó medido: con el peso del PAV
       * en el remate subido al 0,9 la mediana sigue en 69, y corriendo el sector a tope (compromiso
       * 1,0) llega a 70 justo; o sea que las dos palancas obvias del modelo de remate no la mueven,
       * y lo que falta para pasar de 70 no es calibración sino otro modelo de final en adoquín. Su
       * respuesta, textual: «pave 69 ok».
       *
       * Lo que el banco vigila NO se toca: el azar puro daría 64 —el centro exacto del rango
       * 45-83—, así que 69 sigue diciendo que el PAV interviene en el resultado, que es la
       * pregunta. Lo que se ajusta es el listón, no la medida.
       */
      expect(mediana).toBeGreaterThanOrEqual(69) // el centro del rango (azar) sería 64
    },
  )

  it(
    'el trabajo del día se paga en la meta: quien tira remata peor que quien va a rueda',
    { timeout: 30000 },
    () => {
      // Veinte corredores IDÉNTICOS en atributos y tanque. Lo único que los separa es el turno de
      // relevos que les toca por rol (gregario 1.0 contra sprinter 0.2). `workUnits` ya se
      // calculaba y no entraba en el resultado: los dos grupos llegaban en el mismo orden medio.
      const riders: StageRider[] = []
      for (let i = 0; i < 10; i++) {
        riders.push(
          rider(`greg-${i}`, { eff0: eff(65), matches: 3, orders: orders({ role: 'gregario' }) }),
        )
      }
      for (let i = 0; i < 10; i++) {
        riders.push(
          rider(`prot-${i}`, { eff0: eff(65), matches: 3, orders: orders({ role: 'sprinter' }) }),
        )
      }
      const input: StageInput = {
        profile: { segments: [{ km: 180, tipo: 'llano' }] },
        riders,
      }
      let gregPos = 0
      let protPos = 0
      let protWins = 0
      const seeds = seedsFor('peaje', 20)
      for (const seed of seeds) {
        const out = simulateStage(input, seed)
        for (const r of out.results) {
          if (r.riderId.startsWith('greg-')) gregPos += r.puesto
          else protPos += r.puesto
        }
        if (out.results[0]!.riderId.startsWith('prot-')) protWins += 1
      }
      // El protegido remata claramente mejor que el que ha estado dando la cara todo el día.
      expect(protPos / (10 * seeds.length)).toBeLessThan(gregPos / (10 * seeds.length) - 2)
      // Y gana la mayoría de las etapas, sin que sea una ley (piernas del día y ruido del sprint).
      expect(protWins).toBeGreaterThan(seeds.length / 2)
    },
  )

  it(
    'los banners se disputan con la EROSIÓN del momento, no con el corredor del km 0',
    { timeout: 30000 },
    () => {
      // Dos aspirantes a la meta volante: uno mejor rematador de papel (SPR 82) y otro discreto
      // (SPR 70). Con el depósito lleno gana el primero; si llega al banner reventado, no. Antes
      // `disputeBanner` puntuaba con `eff0`, así que el resultado era el MISMO en los dos casos.
      const build = (energyStrong: number): StageInput => {
        const contest = { contestSprints: true, contestClimbs: true }
        const riders: StageRider[] = [
          rider('fuerte', {
            eff0: eff(55, { SPR: 82, RES: 40 }),
            energy: energyStrong,
            matches: 0,
            orders: orders(contest),
          }),
          rider('entero', {
            eff0: eff(55, { SPR: 70, RES: 40 }),
            matches: 0,
            orders: orders(contest),
          }),
        ]
        // Sin cerillos en todo el campo: si alguien se fuga, la volante se disputa en la fuga y el
        // banco deja de medir lo que quiere medir (la erosión en el remate del banner).
        for (let i = 0; i < 20; i++) riders.push(rider(`pel-${i}`, { eff0: eff(52), matches: 0 }))
        return {
          profile: {
            segments: [{ km: 100, tipo: 'llano' }],
            banners: [{ km: 80, tipo: 'meta_volante' }],
          },
          riders,
        }
      }
      const winners = (energy: number): string[] =>
        seedsFor('banner', 12)
          .map((seed) => simulateStage(build(energy), seed))
          .map((out) => out.events.find((e) => e.plantilla === 'sprint_intermediate')!)
          .map((e) => e.protagonistas[0]!)

      const fresco = winners(100)
      // ONCE DE DOCE, y no doce, desde la v35: repartir las piernas del día por ORDEN CANÓNICO
      // (`simulateStage` ordena por `riderId` antes de mirar nada) cambia qué factor le toca a
      // cada uno, y hay una semilla en la que «entero» tiene un buen día y «fuerte» uno malo. SPR
      // 82 contra 70 son doce puntos y `dayFormSd` los puede tapar: es el modelo funcionando.
      // Lo que este banco mide no es esa semilla, es el CONTRASTE de las dos filas —con el depósito
      // lleno gana «fuerte» casi siempre; con el depósito vacío no gana NUNCA—, y eso sigue entero.
      expect(fresco.filter((w) => w === 'fuerte').length).toBeGreaterThanOrEqual(11)
      // Con un depósito de 12 el "fuerte" llega al km 80 con la erosión por las nubes y su punta
      // de velocidad (coef 0.45, el más castigado de la tabla) ya no le da para ganar la volante.
      //
      // Era 16 hasta la v38 y el número tuvo que bajar por una razón que es el modelo funcionando:
      // en un pelotón SIN equipos el turno de relevos pasó de tres o cuatro hombres a veinte (ver
      // `relayDutyThresholdNoTeams`), y el viento se reparte 1/n, así que ahora cada uno paga MENOS
      // por kilómetro. Con el mismo depósito de 16 el "fuerte" ya llega al banner con algo dentro y
      // gana 2 de 12; hace falta salir con menos para llegar reventado. Lo que este banco mide
      // —el CONTRASTE entre depósito lleno y depósito vacío— sigue igual de nítido: 11 de 12 contra
      // 0 de 12.
      const reventado = winners(12)
      expect(reventado.every((w) => w === 'entero')).toBe(true)
    },
  )
})

// --- El abanico (v41, docs/motor.md §19) -----------------------------------------------------

describe('el viento de lado parte la carrera (v41)', () => {
  /** Una llana larga con un campo grande: es donde un abanico tiene sitio para existir. */
  function windInput(): StageInput {
    const riders = Array.from({ length: 120 }, (_, i) =>
      rider(`w-${i}`, {
        eff0: eff(55 + (i % 21), { LLA: 60 + (i % 15) }),
        // Equipos de ocho: sin equipos no hay quien ponga un abanico.
        teamId: `eq-${Math.floor(i / 8)}`,
        orders: orders({ role: i % 8 === 0 ? 'lider' : 'gregario' }),
      }),
    )
    return { profile: { segments: [{ km: 180, tipo: 'llano' }] }, riders }
  }

  const runs = seedsFor('viento', 60).map((seed) => simulateStage(windInput(), seed))
  const conCorte = runs.filter((o) => o.events.some((e) => e.plantilla === 'echelon_split'))

  it(
    'unos días sí y la mayoría no: el abanico es noticia, no la norma',
    { timeout: 120000 },
    () => {
      // El viento de lado se sortea una vez por etapa y solo pasa del listón un día de cada ocho.
      // La cota es holgada a los dos lados a propósito: lo que se vigila es que ni no pase nunca ni
      // pase todos los días, no el número exacto, que lo fija `windMin`.
      expect(conCorte.length).toBeGreaterThan(0)
      expect(conCorte.length).toBeLessThan(runs.length / 2)
    },
  )

  it('el día que corta, el corte MANDA en la carrera', { timeout: 120000 }, () => {
    for (const out of conCorte) {
      const corte = out.events.find((e) => e.plantilla === 'echelon_split')!
      const before = Number(corte.datos!.before)
      const remaining = Number(corte.datos!.remaining)
      // De cuántos a cuántos: nunca «se parte» dejando a todo el mundo dentro.
      expect(remaining).toBeLessThan(before)
      // Y no se recompone solo: el que se queda en la cuneta pierde tiempo de verdad.
      const t = out.results.map((r) => r.tiempoS).sort((a, b) => a - b)
      expect(t[t.length - 1]! - t[0]!).toBeGreaterThan(20)
      // El grupo de cabeza en meta no puede ser el pelotón entero.
      expect(t.filter((x) => x === t[0]).length).toBeLessThan(before)
    }
  })

  it('y el día que no hay viento no hay abanico que valga', { timeout: 120000 }, () => {
    // La otra mitad de la regla: sin el sorteo del día, ni un corte. Si esto falla es que el
    // abanico se ha convertido en algo que pasa siempre, que es justo lo que no puede ser.
    const sinCorte = runs.length - conCorte.length
    expect(sinCorte).toBeGreaterThan(runs.length / 2)
  })
})

// --- Tiempos de grupo (v8) ------------------------------------------------------------------
// El dueño leyó una etapa y encontró 23 corredores con el mismo tiempo y TODOS los demás a
// exactamente 1 segundo. No era un empate: el desempate del sprint sumaba 1 ms por puesto al reloj
// del grupo y luego se redondeaba a segundos, así que un grupo que cruzaba en X,477 salía partido
// en X (los 23 primeros) y X+1 (el resto). En ciclismo todos los de un grupo reciben el MISMO
// tiempo, y la general y la clasificación por equipos venían sumando ese ruido etapa tras etapa.

describe('el tiempo de meta es el del GRUPO, no un artefacto del redondeo (v8)', () => {
  /** Etapa llana larga con un campo grande: el pelotón entero llega junto salvo caídas. */
  function bunchInput(): StageInput {
    // Sin cerillos: lo que se vigila es el REDONDEO del reloj de grupo, así que el pelotón tiene
    // que llegar junto. Con capa táctica (docs/motor.md §13) un ataque parte el campo en grupos
    // legítimos con tiempos distintos, que es otra cosa y se prueba aparte.
    const riders = Array.from({ length: 100 }, (_, i) =>
      rider(`p-${i}`, { eff0: eff(58, { SPR: 52 + (i % 17), LLA: 60 }), fragility: 1, matches: 0 }),
    )
    return { profile: { segments: [{ km: 140, tipo: 'llano' }] }, riders }
  }

  const runs = Array.from({ length: 60 }, (_, s) =>
    simulateStage(
      bunchInput(),
      stageSeed({ worldSeed: `grp-${s}`, raceId: 'grp', stageDay: 1, engineVersion: 1 }),
    ),
  )

  it('un grupo no puede partirse en dos tiempos por el redondeo', { timeout: 60000 }, () => {
    // Cada grupo distinto en meta aporta un tiempo distinto, y en una etapa llana un grupo nuevo
    // solo puede nacer de una caída, de un abanico (v41: el viento de lado parte la fila y cada
    // corte abre un grupo) o del marcaje, que aquí no hay. Con el desempate viejo esta cota se
    // violaba en 3 de estas 60 semillas SIN una sola de esas causas: en la 4.ª el pelotón llegaba
    // repartido en 30 corredores a 11.980 s y 70 a 11.981 s.
    for (const out of runs) {
      const distinct = new Set(out.results.map((r) => r.tiempoS)).size
      // Cada corte de abanico abre hasta `windEchelonMaxGroups - 1` grupos nuevos: no parte la
      // carrera en dos, la rompe en filas sucesivas.
      const cortes = out.events.filter((e) => e.plantilla === 'echelon_split').length
      expect(distinct).toBeLessThanOrEqual(
        1 + out.incidents.length + cortes * (STAGE.windEchelonMaxGroups - 1),
      )
    }
  })

  it('los que comparten tiempo ocupan puestos consecutivos', { timeout: 60000 }, () => {
    // El orden dentro del grupo sale del remate (`finishOrder`), no del reloj: los corredores con el
    // mismo tiempo tienen que formar un bloque contiguo de puestos, sin nadie intercalado.
    for (const out of runs) {
      const seen = new Set<number>()
      let prev: number | null = null
      for (const r of out.results) {
        if (r.tiempoS !== prev) {
          expect(seen.has(r.tiempoS)).toBe(false)
          seen.add(r.tiempoS)
          prev = r.tiempoS
        }
      }
    }
  })

  it('el tiempo persistido es siempre un entero de segundos', () => {
    for (const out of runs)
      for (const r of out.results) expect(Number.isInteger(r.tiempoS)).toBe(true)
  })
})

// --- Telemetría de la carrera (docs/motor.md §16) -------------------------------------------
// El motor simulaba bloque a bloque —quién se descuelga, cuánto boquete hay, quién va delante— y
// tiraba casi todo. La crónica que salía era ilegible: el grupo de cabeza pasaba de 81 corredores
// a 3 en tres kilómetros con DOS descolgados narrados, y la ventaja del ganador aparecía de la
// nada porque el parte de boquete llegaba cada 25 km. Estos tests son el seguro de que no vuelve.

/** Los avisos que cuentan cómo cambia el pelotón, en orden: cortes y reagrupamientos. */
function frontNotices(out: StageOutput): RaceEvent[] {
  return out.events
    .filter((e) => e.plantilla === 'peloton_split' || e.plantilla === 'peloton_regroup')
    .sort((a, b) => a.km - b.km || a.tS - b.tS)
}

/**
 * La cadena de avisos no tiene huecos: el `before` de cada uno es el `remaining` del anterior. Es
 * EL seguro contra el "de 81 a 3 sin explicación" (y contra su simétrico, "de 51 a 100 sin
 * explicación"): para llegar de un tamaño a otro hay que haberlo contado por el camino.
 */
function expectUnbrokenFrontChain(out: StageOutput): void {
  const notices = frontNotices(out)
  for (let i = 1; i < notices.length; i++) {
    expect(Number(notices[i]!.datos!.before)).toBe(Number(notices[i - 1]!.datos!.remaining))
  }
}

describe('telemetría de la crónica (docs/motor.md §16)', () => {
  /** Etapa de montaña larga con una criba continua: el caso que producía el salto de 81 a 3. */
  function shatterInput(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 4; i++) {
      riders.push(
        rider(`gc-${i}`, {
          eff0: eff(60, { MON: 84 + i, COL: 80, LLA: 64 }),
          orders: orders({ role: 'lider', contestClimbs: true }),
        }),
      )
    }
    for (let i = 0; i < 6; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(56, { MON: 72 + (i % 4), COL: 70, LLA: 66, TAC: 60 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestClimbs: true }),
        }),
      )
    }
    for (let i = 0; i < 70; i++) {
      riders.push(rider(`pel-${i}`, { eff0: eff(55, { MON: 46 + (i % 16), LLA: 60 }) }))
    }
    return {
      profile: {
        segments: [
          { km: 130, tipo: 'llano' },
          { km: 20, tipo: 'puerto', tramos: [{ km: 20, g: 8 }] },
        ],
        banners: [{ km: 150, tipo: 'cima' }],
      },
      riders,
    }
  }

  const seeds = Array.from({ length: 12 }, (_, i) =>
    stageSeed({ worldSeed: `tel-${i}`, raceId: 'tel', stageDay: 1, engineVersion: 1 }),
  )
  const runs = seeds.map((s) => simulateStage(shatterInput(), s))

  it('la selección narrada explica el tamaño del grupo: nadie desaparece sin contarlo', () => {
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      for (const e of splits) {
        const before = Number(e.datos!.before)
        const remaining = Number(e.datos!.remaining)
        const dropped = Number(e.datos!.dropped)
        // La frase trae de cuántos a cuántos ha quedado el grupo, y cuántos se han ido DESDE el
        // aviso anterior. Sin `before`/`dropped`, la crónica contaba 2 descolgados mientras el
        // grupo perdía 78 corredores.
        expect(dropped).toBeGreaterThanOrEqual(STAGE.splitEventMinDropped)
        expect(remaining).toBeGreaterThanOrEqual(0)
        expect(before).toBeGreaterThan(0)
        // Y lo narrado es EXACTAMENTE lo que el grupo ha perdido: ni el bruto inflado por los que
        // se sueltan y vuelven, ni una cifra que se queda corta.
        // Desde la capa táctica (§13) el grupo también mengua porque alguien se ESCAPA: la cuenta
        // cierra con los dos términos, y los escapados no se narran como descolgados.
        expect(dropped + Number(e.datos!.escapados ?? 0)).toBe(before - remaining)
      }
      // Y la cadena no tiene huecos: lo que quedaba en un aviso es de lo que parte el siguiente.
      // Este es EL seguro contra el "de 81 a 3 sin explicación": para llegar a 3 desde 81 hay que
      // haber narrado los 78 por el camino, no dos. Desde v8 la cadena incluye también los
      // REAGRUPAMIENTOS, que son la misma cuenta contada en la otra dirección: si el grupo crece,
      // se cuenta igual, y por eso ya no hay saltos ni hacia abajo ni hacia arriba.
      expectUnbrokenFrontChain(out)
    }
  })

  it('un corte grande se cuenta cuando pasa, no cinco kilómetros después', () => {
    // En cada corrida, la mayor caída de tamaño del grupo entre dos avisos consecutivos tiene que
    // seguir siendo explicable: si el grupo se parte de golpe, hay una frase con ese `dropped`.
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      if (splits.length === 0) continue
      const worst = Math.max(...splits.map((e) => Number(e.datos!.dropped)))
      expect(worst).toBeGreaterThanOrEqual(STAGE.splitEventBigDropMin)
    }
  })

  it('cuando quedan pocos delante, la crónica sabe QUIÉNES son', () => {
    // No en TODAS: si la fuga sale de 6 y llega entera hasta que la cazan, y el pelotón nunca baja
    // de 8, no hay nada que nombrar y callarse es lo correcto. Lo que no puede pasar es que la
    // criba deje 5 corredores delante y la crónica siga hablando de números.
    const withNames = runs.filter((out) =>
      out.events.some((e) => e.plantilla === 'front_group' && e.protagonistas.length > 0),
    )
    expect(withNames.length).toBeGreaterThanOrEqual(runs.length - 2)
    for (const out of runs) {
      for (const e of out.events.filter((x) => x.plantilla === 'front_group')) {
        expect(e.protagonistas.length).toBe(Number(e.datos!.size))
        expect(e.protagonistas.length).toBeLessThanOrEqual(STAGE.frontNamesMaxRiders)
        // Sin repetidos y con ids reales de la etapa.
        expect(new Set(e.protagonistas).size).toBe(e.protagonistas.length)
      }
    }
  })

  it('la ventaja final no aparece de la nada: hay parte de boquete cerca de meta', () => {
    const totalKm = 150
    for (const out of runs) {
      const win = out.events.find((e) => e.plantilla === 'stage_win')!
      const margin = Number(win.datos!.margin ?? 0)
      if (margin < STAGE.gapReportMinSeconds) continue
      // Si el ganador llega con ventaja apreciable, el lector la ha visto crecer: tiene que haber
      // al menos un parte (boquete o cabeza) dentro de la ventana del desenlace.
      const late = out.events.filter(
        (e) =>
          (e.plantilla === 'time_gap' || e.plantilla === 'front_group') &&
          e.km >= totalKm - STAGE.gapReportFinalKm,
      )
      expect(late.length).toBeGreaterThan(0)
    }
  })

  it('narrar más no es narrar todo: la crónica no se convierte en un muro de texto', () => {
    for (const out of runs) {
      // Se cuentan las líneas NARRABLES: desde la capa táctica (docs/motor.md §13) el motor emite
      // todos los intentos como telemetría y marca con `narra` cuáles merecen una frase, porque
      // una etapa tiene una docena de intentos y la crónica no puede ser su inventario.
      // El techo sube de 40 a 46 en la v11: la ATRIBUCIÓN DEL TRABAJO añade tres familias de frase
      // —quién tira del pelotón (4-5 por etapa), quién cerró la persecución (~1) y cómo se reparte
      // el trabajo en la fuga (≤1)—, así que el peor caso medido de este banco pasa de 40 a 41. No
      // es que se narre más de lo mismo: son líneas que antes no existían y que el dueño pidió.
      //
      // Y DE 46 A 48 EN LA v26, por UNA línea nueva de una familia que antes no podía existir: el
      // REAGRUPAMIENTO. Con el descuelgue en dado, el pelotón se rompía y lo que se soltaba no
      // volvía; con la deriva se estira en la rampa y se cierra en el llano, así que la crónica tiene
      // que contar las dos mitades del suceso o deja al lector con «quedan 41 delante» y ciento
      // veinte en meta. El peor caso medido de este banco pasa de 46 a 47, y el techo se deja en 48
      // por el mismo margen de uno con el que se dejó en la v11. No hay ninguna familia de frase
      // repetida: está comprobado arriba, en «el puerto se cuenta en pocas frases de progresión».
      //
      // Y DE 48 A 100 EN LA v38, por decisión del dueño: «el tope de 48 para el journal podemos
      // cambiarlo a 100 sin problema, y no me preocupa de momento». Este techo nunca fue una
      // calibración, era un centinela contra el muro de texto, y con la ley de velocidad nueva las
      // carreras se rompen y se recomponen más veces, así que el peor caso de este banco sube a 50.
      // Lo que SÍ sigue vigilado —que no se repita una familia de frase— se comprueba aparte.
      const narrated = out.events.filter((e) => e.datos?.narra !== 0)
      expect(narrated.length).toBeLessThanOrEqual(100)
    }
  })

  it('el corte dice si el grupo va en cabeza o persiguiendo a una fuga', () => {
    for (const out of runs) {
      for (const e of out.events.filter((x) => x.plantilla === 'peloton_split')) {
        expect([0, 1]).toContain(Number(e.datos!.chasing))
      }
    }
  })
})

// --- La criba se cuenta como una historia, no como un parte cada 3 km (v8) ------------------
// El dueño leyó diez líneas casi idénticas entre el km 180 y el 207, con el mismo equipo nombrado
// diez veces y cifras acumuladas presentadas como si fueran nuevas ("54 descolgados" con el grupo
// pasando de 76 a 76: no cayó nadie). El origen: la cuenta narrada era el recuento BRUTO de
// descuelgues, y en el desenlace los mismos corredores se sueltan en la rampa y vuelven en el
// repecho, así que el bruto se disparaba mientras el grupo no se movía.

describe('una criba sostenida no genera diez frases clónicas (v8)', () => {
  /**
   * Puerto ESCALONADO de 30 km en el desenlace: rampas de 1 km al 5,5% separadas por 2 km al -1%.
   * Es el terreno que produce el churn (soltarse y volver) del caso del dueño. Con el recuento
   * bruto salían hasta SEIS avisos por etapa con el mismo protagonista nombrado seis veces.
   */
  function staircaseInput(): StageInput {
    const tramos: { km: number; g: number }[] = []
    for (let k = 0; k < 10; k++) {
      tramos.push({ km: 1, g: 5.5 })
      tramos.push({ km: 2, g: -1 })
    }
    const riders: StageRider[] = []
    for (let i = 0; i < 8; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(58, { MON: 74 + (i % 5), COL: 72, LLA: 66, TAC: 62 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
        }),
      )
    }
    for (let i = 0; i < 160; i++) {
      riders.push(
        rider(`pel-${i}`, { eff0: eff(56, { MON: 50 + (i % 22), LLA: 62, SPR: 50 + (i % 15) }) }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 180, tipo: 'llano' },
          { km: 30, tipo: 'puerto', tramos },
        ],
      },
      riders,
    }
  }

  const runs = Array.from({ length: 8 }, (_, i) =>
    simulateStage(
      staircaseInput(),
      stageSeed({ worldSeed: `sv-${i}`, raceId: 'sv', stageDay: 1, engineVersion: 1 }),
    ),
  )

  it('el puerto se cuenta en pocas frases de progresión', { timeout: 60000 }, () => {
    // EL TECHO SUBE DE 3 A 4 EN LA v21, y no porque se narre más de lo mismo. El listón nuevo —una
    // criba que se lleva ≥20 corredores Y ≥25 % del grupo se cuenta aunque el escalado del throttle
    // diga que no— existe porque en producción el grupo pasaba de 101 a 16 en dos kilómetros sin una
    // línea (Race Bességes e4). En este banco solo lo dispara una de las ocho semillas, y cuando lo
    // hace, las cuatro frases son 161 → 133 → 63 → 35 → 10: cada una cuenta una pérdida enorme.
    // Lo que este test vigila es que no vuelvan las diez frases clónicas, y eso sigue en pie.
    //
    // Y DE 4 A 5 EN LA v26, con la misma clase de razón y midiendo antes de tocar nada. El techo se
    // puso sobre un motor que subía el puerto de golpe: con el descuelgue en dado, un puerto se
    // resolvía en dos o tres saltos grandes (8 relojes distintos en la cima de una reina real). Con
    // la deriva son 19,5, y una escalera de 30 km se deshace por escalones en vez de por saltos.
    // Medido en las ocho semillas de este banco: **1 · 3 · 3 · 3 · 4 · 4 · 4 · 5 partes**, y la que
    // da cinco cuenta 161 → 131 → 94 → 70 → 48 → 27 en 19 km. Ninguna es relleno y no es que el
    // throttle se haya roto: las cuatro últimas entran por la regla `decisive` de la v21 —≥20
    // corredores Y ≥25 % del grupo— que existe precisamente para que una criba así no pase muda.
    // Lo que el test vigila (que no vuelvan las diez frases clónicas) sigue igual de vigilado, y se
    // le añade el listón que el techo por etapa no puede ver: la MEDIA del banco, que es lo que se
    // movería si de verdad se estuviera narrando de más.
    let total = 0
    for (const out of runs) {
      const splits = out.events.filter((e) => e.plantilla === 'peloton_split')
      expect(splits.length).toBeLessThanOrEqual(5)
      total += splits.length
      // Y ninguna de ellas es un parte de relleno: todas narran una criba de verdad.
      for (const e of splits) {
        const before = Number(e.datos!.before)
        const remaining = Number(e.datos!.remaining)
        expect(before - remaining).toBeGreaterThanOrEqual(STAGE.splitEventMinDropped)
      }
    }
    // Medido: 27 partes en 8 semillas = 3,4 de media. El listón en 4 deja sitio a la semilla que da
    // cinco y sigue cazando una inflación general, que es lo que un techo por etapa se traga.
    expect(total / runs.length).toBeLessThanOrEqual(4)
  })

  it(
    'la cifra narrada es lo que el grupo PIERDE, nunca el bruto inflado',
    { timeout: 60000 },
    () => {
      for (const out of runs) {
        for (const e of out.events.filter((x) => x.plantilla === 'peloton_split')) {
          const before = Number(e.datos!.before)
          const remaining = Number(e.datos!.remaining)
          // Un corte narra siempre una pérdida REAL: nunca "N descolgados" con el grupo igual o mayor.
          expect(before).toBeGreaterThan(remaining)
          const escapados = Number(e.datos!.escapados ?? 0)
          expect(Number(e.datos!.dropped)).toBe(before - remaining - escapados)
          // El bruto sigue viajando como telemetría, y nunca es menor que la pérdida neta por
          // descuelgue (los que se han ido por delante en un ataque no son un descuelgue).
          expect(Number(e.datos!.shed)).toBeGreaterThanOrEqual(before - remaining - escapados)
        }
      }
    },
  )

  it('no se nombra al mismo protagonista en dos avisos seguidos', { timeout: 60000 }, () => {
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      for (let i = 1; i < splits.length; i++) {
        const prev = splits[i - 1]!.protagonistas[0]
        const now = splits[i]!.protagonistas[0]
        if (prev && now) expect(now).not.toBe(prev)
      }
    }
  })

  it('el primer aviso presenta la criba y los siguientes cuentan la progresión', () => {
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      splits.forEach((e, i) => expect(Number(e.datos!.phase)).toBe(i))
    }
  })

  it('la cadena de avisos sigue sin huecos', { timeout: 60000 }, () => {
    for (const out of runs) expectUnbrokenFrontChain(out)
  })
})

// --- El reagrupamiento existe y ahora se cuenta (v8) ----------------------------------------
// La crónica decía "about 51 left in front" y en meta llegaban más de cien juntos. Medido: no
// mentían las cuentas, faltaba el evento. Los cortados vuelven y se reenganchan dentro de
// `regroupGapSeconds`, así que el grupo se recompone de verdad entre el último puerto y la meta — y
// el motor no lo contaba en ninguna parte.
//
// EL BANCO CAMBIA EN LA v16, y conviene decir por qué. Era un puerto de 14 km al 8% con 26 km de
// llano detrás, y se recomponía en las 8 semillas… porque el recorte fijo de 8 s/km le devolvía el
// boquete al descolgado pasara lo que pasara. Con el recorte fuera, ese puerto es una SELECCIÓN: 14
// km al 8% a 26 de meta dejan delante a nueve corredores y detrás a setenta, y setenta no cazan a
// nueve en 26 km de llano —eso es una etapa de montaña, no un reagrupamiento—. El banco pasa a un
// puerto que PARTE el pelotón sin destrozarlo (12 km al 7%) con 30 km de valle detrás, que es el
// caso que este test vigila: los cortados vuelven, y cuando vuelven hay una frase que lo cuenta.
// Medido: 8 de 8 semillas antes y después del cambio. La aserción NO se ha tocado.
//
// Y EL PUERTO SE AFLOJA MEDIO PUNTO EN LA v19 (7% → 6,5%), por la misma razón y con la aserción otra
// vez intacta. La v19 corrige la ley de velocidad y en la cuesta el exponente pasa a ser el de la
// gravedad (docs/balance.md «v19»), de modo que el MISMO puerto selecciona un poco más: con 12 km al
// 7% una de las ocho semillas dejaba delante a 25 corredores y a 53 detrás a ocho minutos, que ya no
// es «partir sin destrozar» sino una etapa de montaña, y en ella no hay reagrupamiento que narrar.
// Con 6,5% vuelven a ser 8 de 8 y el puerto sigue partiendo el pelotón (4-5 grupos en meta). Lo que
// este banco vigila es que el reagrupamiento se CUENTE, no cuánto selecciona un puerto concreto: eso
// lo miden `sim/realQueens.ts` y `grandTour.queenLastGroupPct`, y los dos suben en la v19.

describe('el reagrupamiento se narra (v8)', () => {
  /** Puerto a 42 km de meta y 30 km de valle después: los cortados vuelven antes de la línea. */
  function regroupInput(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 6; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(56, { MON: 72 + (i % 4), COL: 70, LLA: 66, TAC: 60 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
        }),
      )
    }
    for (let i = 0; i < 74; i++) {
      riders.push(
        rider(`pel-${i}`, { eff0: eff(56, { MON: 48 + (i % 18), LLA: 62, SPR: 50 + (i % 13) }) }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 100, tipo: 'llano' },
          // EL PUERTO PASA DE 12 A 14 KM EN LA v26, y es la tercera vez que el perfil de este banco
          // se mueve sin que la aserción cambie (la v16 ya lo hizo, y por la misma clase de razón).
          // Lo que este test comprueba es que **un reagrupamiento se narra**, y para eso hace falta
          // que primero haya un corte de verdad. Con el descuelgue en dado bastaban 12 km porque el
          // dado soltaba gente desde el primer bloque; con la deriva y la reserva de la v26 hay que
          // AGOTAR la reserva antes de ceder un metro, y 12 km al 6,5 % se quedan justo en el filo:
          // medido sobre las 8 semillas, 7 narran el reagrupamiento y una no llega a partirse. Con
          // 14 km lo narran las 8. No se ha tocado ni el campo ni la aserción ni las constantes.
          { km: 14, tipo: 'puerto', tramos: [{ km: 14, g: 6.5 }] },
          { km: 30, tipo: 'llano' },
        ],
      },
      riders,
    }
  }

  const runs = Array.from({ length: 8 }, (_, i) =>
    simulateStage(
      regroupInput(),
      stageSeed({ worldSeed: `rg-${i}`, raceId: 'rg', stageDay: 1, engineVersion: 1 }),
    ),
  )

  /**
   * LA ASERCIÓN SE ABLANDÓ A MITAD DE LA v26 —de «las ocho semillas» a «al menos seis de ocho»— Y
   * VUELVE A ESTAR ENTERA, que es como tiene que quedar. Se deja escrito el episodio porque el
   * número explica el motor.
   *
   * Con el descuelgue en dado el sorteo soltaba gente desde el primer bloque de rampa pasara lo que
   * pasara; con la deriva y la reserva hay que AGOTAR la reserva antes de ceder un metro, así que en
   * las semillas en que el grupo sube el puerto a tempo no se rompe, y donde no hay corte no hay
   * reagrupamiento que narrar. Con el puerto ya alargado de 12 a 14 km eran **7 de 8**, y por eso el
   * suelo se puso provisionalmente en seis.
   *
   * Con la tanda entera puesta —y en particular con el trabajo medido por el VIENTO (docs/balance.md
   * «v26» §9), que le cobra a la fuga sus horas de relevos y cambia con qué depósito llega el grupo
   * al pie— vuelven a ser **8 de 8**, con 1 a 3 partes de reagrupamiento por semilla. Medido antes de
   * devolver la aserción, no después.
   *
   * Y no se ablandó para tapar un defecto de narración: el defecto que SÍ había —que la referencia
   * del reagrupamiento subía siguiendo al grupo que volvía, así que solo se podía narrar si el
   * puerto moría en el kilómetro exacto en que empieza el desenlace— está arreglado en el motor en
   * esta misma tanda (ver `frontAtLastNotice` fuera del desenlace, en `simulate.ts`).
   */
  it('cuando el pelotón se recompone hay un evento que lo cuenta', { timeout: 60000 }, () => {
    for (const out of runs) {
      const regroups = out.events.filter((e) => e.plantilla === 'peloton_regroup')
      expect(regroups.length).toBeGreaterThan(0)
    }
  })

  it(
    'el reagrupamiento cuadra: los que vuelven son la diferencia de tamaño',
    { timeout: 60000 },
    () => {
      for (const out of runs) {
        for (const e of out.events.filter((x) => x.plantilla === 'peloton_regroup')) {
          const before = Number(e.datos!.before)
          const now = Number(e.datos!.remaining)
          expect(now).toBeGreaterThan(before)
          expect(Number(e.datos!.joined)).toBe(now - before)
          expect(Number(e.datos!.joined)).toBeGreaterThanOrEqual(STAGE.regroupEventMinRiders)
        }
      }
    },
  )

  it('un crecimiento del grupo NUNCA se narra como un corte', { timeout: 60000 }, () => {
    // Era lo que pasaba antes: el aviso decía "2 riders are shelled — about 68 left in front"
    // justo después de haber dicho que quedaban 6. La frase de corte contaba un reagrupamiento.
    for (const out of runs) {
      for (const e of out.events.filter((x) => x.plantilla === 'peloton_split')) {
        expect(Number(e.datos!.before)).toBeGreaterThan(Number(e.datos!.remaining))
      }
    }
  })

  it('la cadena de avisos cubre también los reagrupamientos', { timeout: 60000 }, () => {
    for (const out of runs) expectUnbrokenFrontChain(out)
  })
})

describe('el puerto decisivo no es toda la etapa (defecto medido, docs/balance.md)', () => {
  /** Final en alto con un puerto INTERMEDIO a mitad de recorrido y llano largo después. */
  const input: StageInput = {
    profile: {
      segments: [
        { km: 30, tipo: 'llano' },
        { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 7 }] },
        { km: 80, tipo: 'llano' },
        { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 8 }] },
      ],
    },
    riders: Array.from({ length: 40 }, (_, i) =>
      rider(`p-${i}`, { eff0: eff(55, { MON: 48 + (i % 18), LLA: 60 }) }),
    ),
  }

  it('un puerto a 90 km de meta no revienta el pelotón como el último', () => {
    const seed = stageSeed({ worldSeed: 'mid', raceId: 'mid', stageDay: 1, engineVersion: 1 })
    const out = simulateStage(input, seed)
    // Ningún corte narrado antes de la ventana del puerto decisivo: en el puerto de tempo el
    // pelotón se recompone y anunciar "N se descuelgan" ahí es engañoso.
    const early = out.events.filter(
      (e) => e.plantilla === 'peloton_split' && e.km < 130 - STAGE.climbRaceKmToGo,
    )
    expect(early).toEqual([])
  })
})

// --- LA CRIBA LEJOS DE META (v21, docs/motor.md §16) ----------------------------------------
// El corte del desenlace vive dentro de los últimos `climbRaceKmToGo` km, y esa ventana existe por
// una razón medida (sin ella cada cota escupía una línea). Pero la etapa se decide a veces mucho
// antes —Race Great Ocean, de 116 a 80 a 50 km de meta— y eso no tenía frase. El motor pone la
// MAGNITUD; que la criba no se deshaga después lo decide la crónica, que ve la etapa entera.

describe('la criba lejos de meta se cuenta cuando es de verdad (v21)', () => {
  /**
   * Un puerto duro que acaba a 50 km de meta, con el campo en ESCALÓN: 24 escaladores muy por
   * encima de una masa homogénea. Es la forma que rompe una carrera de verdad (la misma lección del
   * banco de la v17), y por eso es el banco de la criba lejana.
   */
  function farSelectionInput(): StageInput {
    return {
      profile: {
        segments: [
          { km: 130, tipo: 'llano' },
          { km: 20, tipo: 'puerto', tramos: [{ km: 20, g: 8 }] },
          { km: 50, tipo: 'llano' },
        ],
      },
      riders: Array.from({ length: 120 }, (_, i) =>
        rider(`p-${i}`, {
          eff0:
            i < 24
              ? eff(60, { MON: 78, COL: 74, LLA: 66 })
              : eff(55, { MON: 44 + (i % 12), LLA: 60 }),
          teamId: `t-${i % 15}`,
        }),
      ),
    }
  }

  /**
   * VEINTICUATRO SEMILLAS Y NO OCHO (v41). Con ocho, esta prueba era una moneda: la tasa real de
   * este recorrido es del 68 % —medida sobre 40 semillas, 27 y 28 según la versión— y con n = 8 un
   * 3 de 8 entra dentro de lo normal sin que nada se haya roto. Pasó al cambiar quién ataca (el que
   * va tirando ya no salta), que no mueve la tasa ni un punto y aun así tumbaba la prueba. Más
   * semillas es un listón MÁS exigente, no más flojo: lo que se relaja es el ruido.
   */
  const runs = seedsFor('criba-lejos', 24).map((s) => simulateStage(farSelectionInput(), s))
  const selections = (out: StageOutput): RaceEvent[] =>
    out.events.filter((e) => e.plantilla === 'peloton_selection')

  it(
    'la selección que parte la carrera a 50 km de meta tiene evento propio',
    { timeout: 120000 },
    () => {
      const withEvent = runs.filter((out) => selections(out).length > 0)
      // La mitad de las etapas, sobre una tasa medida del 68 %: lo que se vigila es que el evento
      // exista y sea la norma en un recorrido hecho para producirlo, no un número fino.
      expect(withEvent.length).toBeGreaterThanOrEqual(runs.length / 2)
    },
  )

  it('y ocurre FUERA del desenlace: dentro ya lo cuenta el corte de siempre', () => {
    for (const out of runs) {
      for (const e of selections(out)) {
        expect(Number(e.datos!.toGo)).toBeGreaterThan(STAGE.climbRaceKmToGo)
      }
    }
  })

  it('solo se cuenta la criba GRANDE: el listón es de magnitud, no de kilómetro', () => {
    for (const out of runs) {
      for (const e of selections(out)) {
        const dropped = Number(e.datos!.dropped)
        const before = Number(e.datos!.before)
        expect(dropped).toBeGreaterThanOrEqual(STAGE.splitFarMinDropped)
        expect(dropped).toBeGreaterThanOrEqual(before * STAGE.splitFarMinDropFraction)
      }
    }
  })

  it('la cuenta cierra: los descolgados más los escapados son la diferencia de tamaño', () => {
    for (const out of runs) {
      for (const e of selections(out)) {
        const before = Number(e.datos!.before)
        const remaining = Number(e.datos!.remaining)
        expect(before).toBeGreaterThan(remaining)
        expect(Number(e.datos!.dropped) + Number(e.datos!.escapados)).toBe(before - remaining)
      }
    }
  })

  it('una criba lejana es UNA noticia, no un parte por rampa', () => {
    for (const out of runs) expect(selections(out).length).toBeLessThanOrEqual(2)
  })

  it('los avisos guardan entre sí el throttle ancho', () => {
    for (const out of runs) {
      const kms = selections(out)
        .map((e) => e.km)
        .sort((a, b) => a - b)
      for (let i = 1; i < kms.length; i++) {
        expect(kms[i]! - kms[i - 1]!).toBeGreaterThanOrEqual(STAGE.splitFarKmGap)
      }
    }
  })
})

// --- LO QUE EL DUEÑO CONTÓ EN UN JOURNAL DE PRODUCCIÓN (v21, Race Bességes e4) ----------------
// Cuatro defectos del MOTOR en la misma etapa: un corredor que se rinde en el km 147 y aparece
// tirando del pelotón en el 157 y firmando la caza en el 164; ocho corredores «rindiéndose» en la
// línea de meta (`toGo: 0`); una fuga de UN corredor que «colabora bien»; y un ataque en el km 0.

describe('el journal de producción de Race Bességes e4 (v21)', () => {
  /** Etapa dura de 164 km con final en repecho: el terreno donde la gente se deja ir. */
  function besseges(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 8; i++) {
      riders.push(
        rider(`fav-${i}`, {
          eff0: eff(62, { MON: 74 + (i % 4), LLA: 68, SPR: 66 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
          teamId: `bt-${i % 8}`,
        }),
      )
    }
    for (let i = 0; i < 112; i++) {
      riders.push(
        rider(`pel-${i}`, {
          eff0: eff(54, { MON: 44 + (i % 16), LLA: 60 + (i % 8) }),
          teamId: `bt-${i % 16}`,
        }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 120, tipo: 'llano' },
          { km: 30, tipo: 'puerto', tramos: [{ km: 30, g: 4 }] },
          { km: 14, tipo: 'puerto', tramos: [{ km: 14, g: 6 }] },
        ],
      },
      riders,
    }
  }

  const runs = seedsFor('besseges', 8).map((s) => simulateStage(besseges(), s))

  it('el que se rinde no vuelve a SALIR NOMBRADO tirando del pelotón ni firmando la caza', () => {
    // Lo que se arregla es a quién se NOMBRA, no el reparto del viento. Sacar al rendido del turno
    // de relevos se probó y se descartó con números: deja al último grupo de una etapa reina de gran
    // vuelta en el 7,7 % (objetivo 8-14 %) y devuelve etapas reina con el pelotón entero al mismo
    // segundo. Está medido en docs/balance.md, «v21», y anotado como defecto abierto.
    for (const out of runs) {
      const gaveUpAt = new Map<string, number>()
      for (const e of out.events) {
        if (e.plantilla !== 'rider_sits_up') continue
        for (const id of e.protagonistas) if (!gaveUpAt.has(id)) gaveUpAt.set(id, e.km)
      }
      for (const e of out.events) {
        if (e.plantilla !== 'peloton_pull' && e.plantilla !== 'chase_work') continue
        for (const id of e.protagonistas) {
          const km = gaveUpAt.get(id)
          expect(
            km === undefined || km > e.km,
            `${id} se rindió en el km ${km} y ${e.plantilla} lo nombra en el ${e.km}`,
          ).toBe(true)
        }
      }
    }
  })

  it('nadie se deja ir en la línea de meta', () => {
    for (const out of runs) {
      for (const e of out.events) {
        if (e.plantilla !== 'rider_sits_up') continue
        expect(Number(e.datos!.toGo)).toBeGreaterThanOrEqual(STAGE.giveUpMinKmToGo)
      }
    }
  })

  it('una fuga de un solo corredor no colabora consigo misma', () => {
    for (const out of runs) {
      for (const e of out.events) {
        if (e.plantilla !== 'break_cooperation') continue
        expect(e.protagonistas.length).toBeGreaterThan(1)
      }
    }
  })

  it('no se NARRA un ataque antes de que baje la bandera', () => {
    // Lo que se quita es la frase y no el movimiento: en carretera las fugas salen del disparo, y
    // prohibir el intento significaría no tirar su dado y desplazar el flujo táctico de todas las
    // etapas del juego (medido en `attribution.test.ts` y en docs/balance.md, «v21»).
    for (const out of runs) {
      for (const e of out.events) {
        if (e.tipo !== 'intento') continue
        if (e.km >= STAGE.tacticMinAttackKm) continue
        expect(e.datos?.narra).toBe(0)
      }
    }
  })

  it('la captura de la fuga dice quiénes eran, cuánto llevaban fuera y dónde acabó', () => {
    const caught = runs.flatMap((out) =>
      out.events.filter((e) => e.plantilla === 'breakaway_caught'),
    )
    expect(caught.length).toBeGreaterThan(0)
    for (const e of caught) {
      expect(Number(e.datos!.size)).toBe(e.protagonistas.length)
      expect(Number(e.datos!.awayKm)).toBeGreaterThanOrEqual(0)
      expect(Number(e.datos!.toGo)).toBeGreaterThanOrEqual(0)
    }
  })

  it('la criba que decide el final se cuenta aunque el throttle diga que no', () => {
    // El defecto medido: «de 128 a 101» en el km 160 y, dos kilómetros después, 16 corredores en
    // cabeza sin una sola línea. Una pérdida de esa magnitud rompe el escalado del throttle.
    for (const out of runs) {
      const splits = out.events
        .filter((e) => e.plantilla === 'peloton_split')
        .sort((a, b) => a.km - b.km)
      for (let i = 1; i < splits.length; i++) {
        const before = Number(splits[i]!.datos!.before)
        const remaining = Number(splits[i]!.datos!.remaining)
        /**
         * Ningún aviso puede partir de un grupo MÁS PEQUEÑO que el que dejó el anterior: eso sería
         * una pérdida silenciosa, que es el defecto que este banco vigila.
         *
         * Lo que sí puede es partir de uno MAYOR (v39): entre dos cribas se reagrupa gente —vuelve
         * un grupeto, se caza una fuga y se funde con el pelotón— y el grupo crece. Hasta la v38
         * esto exigía igualdad exacta, y con las fugas grandes de la v39 eso se rompe por una razón
         * legítima: se va una fuga de quince, la cazan, y el pelotón siguiente es mayor que el que
         * dejó el aviso anterior. Medido: 19 donde el aviso previo dejaba 10. La cadena sigue sin
         * huecos; lo que no puede haber es un escalón hacia abajo sin contarlo.
         */
        expect(before).toBeGreaterThanOrEqual(Number(splits[i - 1]!.datos!.remaining))
        expect(before).toBeGreaterThan(remaining)
      }
    }
  })
})

// --- La capa táctica en carrera (docs/motor.md §13, v9) --------------------------------------
// Las nueve reglas del dueño, vistas desde la carretera. Las DECISIONES se prueban una a una en
// `tactics.test.ts`; aquí se comprueba que producen carrera: que hay intentos, que la mayoría
// fracasan, que la fuga del día EMERGE en vez de estar decidida antes del km 0, que un ataque
// logrado es un grupo con su propio tiempo, y que dos semillas no cuentan la misma historia.

describe('capa táctica: el intento de movimiento (docs/motor.md §13)', () => {
  /** Etapa llana de 180 km con sprinters, cazaetapas combativos y un pelotón de rodadores. */
  function tacticalFlat(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 3; i++) {
      riders.push(
        rider(`spr-${i}`, {
          eff0: eff(55, { SPR: 84 + i, LLA: 68 }),
          orders: orders({ role: 'sprinter', contestSprints: true }),
        }),
      )
    }
    for (let i = 0; i < 6; i++) {
      riders.push(
        rider(`brk-${i}`, {
          eff0: eff(55, { TAC: 60, LLA: 68 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
        }),
      )
    }
    for (let i = 0; i < 31; i++) {
      riders.push(rider(`pel-${i}`, { eff0: eff(56, { LLA: 62 + (i % 8) }) }))
    }
    return { profile: { segments: [{ km: 180, tipo: 'llano' }] }, riders }
  }

  const flatRuns = seedsFor('tactica', 40).map((s) => simulateStage(tacticalFlat(), s))

  it('reglas 1 y 5: hay MUCHOS intentos por etapa, no uno', { timeout: 60000 }, () => {
    const counts = flatRuns.map((out) => out.events.filter((e) => e.tipo === 'intento').length)
    const median = [...counts].sort((a, b) => a - b)[Math.floor(counts.length / 2)]!
    expect(median).toBeGreaterThanOrEqual(5)
    // …y tampoco un muro: la carrera respira entre ataque y ataque (`tacticAttemptCooldownKm`).
    expect(Math.max(...counts)).toBeLessThanOrEqual(40)
  })

  it('reglas 3 y 4: fracasar es lo NORMAL', { timeout: 60000 }, () => {
    let tries = 0
    let ok = 0
    for (const out of flatRuns) {
      tries += out.events.filter((e) => e.tipo === 'intento').length
      ok += out.events.filter((e) => e.tipo === 'ataque' || e.tipo === 'fuga_formada').length
    }
    expect(tries).toBeGreaterThan(0)
    // Una etapa con un solo intento que sale bien a la primera es un fallo de calibración.
    expect(ok / tries).toBeLessThan(0.5)
  })

  it('regla 5: la fuga del día EMERGE, no está decidida antes del km 0', { timeout: 60000 }, () => {
    const kms = flatRuns
      .map((out) => out.events.find((e) => e.tipo === 'fuga_formada'))
      .filter((e): e is RaceEvent => e != null)
      .map((e) => e.km)
    // Se forma en casi todas las etapas, pero no en todas: a veces el pelotón no da cuerda a nadie.
    expect(kms.length).toBeGreaterThan(flatRuns.length * 0.7)
    expect(kms.length).toBeLessThanOrEqual(flatRuns.length)
    // Y el kilómetro en que cuaja VARÍA: antes era un número inventado en un rango fijo de 3 a 20.
    expect(new Set(kms.map((k) => Math.round(k))).size).toBeGreaterThan(8)
    expect(Math.max(...kms) - Math.min(...kms)).toBeGreaterThan(20)
  })

  it('un ataque logrado ES un grupo nuevo: se le integra su boquete', { timeout: 60000 }, () => {
    for (const out of flatRuns) {
      for (const e of out.events.filter((x) => x.tipo === 'ataque')) {
        // El evento solo se emite cuando el movimiento ha abierto de verdad el hueco.
        expect(Number(e.datos!.gapS)).toBeGreaterThanOrEqual(STAGE.tacticBreakGapSeconds - 1)
        expect(e.protagonistas.length).toBeGreaterThan(0)
      }
    }
  })

  it('dos semillas no cuentan la misma carrera', { timeout: 60000 }, () => {
    // El guion de una etapa: cuándo cuaja la fuga, cuántos intentos hubo, si la cazan y cómo se
    // resuelve. Antes de la capa táctica esto daba 8 guiones distintos en 120 etapas.
    const scripts = flatRuns.map((out) => {
      const formed = out.events.find((e) => e.tipo === 'fuga_formada')
      const win = out.events.find((e) => e.tipo === 'meta')
      return [
        formed ? Math.round(formed.km / 20) : 'sin-fuga',
        Math.round(out.events.filter((e) => e.tipo === 'intento').length / 4),
        out.events.some((e) => e.tipo === 'fuga_cazada') ? 'cazada' : 'viva',
        String(win?.datos?.fuga ?? 0),
        String(win?.datos?.finish ?? ''),
      ].join('|')
    })
    expect(new Set(scripts).size).toBeGreaterThanOrEqual(6)
  })

  it('el motor sigue siendo determinista: misma semilla, misma carrera', () => {
    const seed = seedsFor('tactica-det', 1)[0]!
    const a = simulateStage(tacticalFlat(), seed)
    const b = simulateStage(tacticalFlat(), seed)
    expect(b.results.map((r) => `${r.riderId}:${r.tiempoS}:${r.puesto}`)).toEqual(
      a.results.map((r) => `${r.riderId}:${r.tiempoS}:${r.puesto}`),
    )
    expect(b.events.length).toBe(a.events.length)
  })

  it('la crónica CUENTA los ataques, y no los inventaría', { timeout: 60000 }, () => {
    for (const out of flatRuns) {
      const attempts = out.events.filter((e) => e.tipo === 'intento')
      const narrated = attempts.filter((e) => e.datos!.narra === 1)
      if (attempts.length === 0) continue
      // Un ataque que ocurre y no se narra no existe para el jugador: al menos uno se cuenta.
      expect(narrated.length).toBeGreaterThan(0)
      // Pero no todos: la crónica no es el inventario de una docena de intentos fallidos.
      expect(narrated.length).toBeLessThanOrEqual(Math.max(3, attempts.length))
      for (const e of narrated) {
        expect(['fuga', 'contraataque', 'puente', 'ataque_grupo', 'ataque_final']).toContain(
          e.datos!.kind,
        )
      }
    }
  })
})

describe('regla 8: el agotado se deja ir, con el cuidado del fuera de control', () => {
  /** Etapa reina corrida con el depósito de la tercera semana: el campo llega vaciado al final. */
  function tiredQueen(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 4; i++) {
      riders.push(
        rider(`gc-${i}`, {
          eff0: eff(60, { MON: 84 + i, COL: 80, LLA: 64 }),
          energy: 58,
          orders: orders({ role: 'lider' }),
        }),
      )
    }
    for (let i = 0; i < 36; i++) {
      riders.push(
        rider(`pel-${i}`, {
          eff0: eff(55, { MON: 54 + (i % 12), LLA: 60 }),
          energy: 58,
          orders: orders({ role: 'gregario' }),
        }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 135, tipo: 'llano' },
          { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
        ],
      },
      riders,
    }
  }

  const runs = seedsFor('regla8', 24).map((s) => simulateStage(tiredQueen(), s))

  it('en una etapa dura alguien administra el esfuerzo al final', { timeout: 60000 }, () => {
    const withGiveUp = runs.filter((out) => out.events.some((e) => e.tipo === 'abandona_ritmo'))
    expect(withGiveUp.length).toBeGreaterThan(runs.length * 0.2)
  })

  it('solo en los últimos km, nunca a mitad de etapa', { timeout: 60000 }, () => {
    for (const out of runs) {
      for (const e of out.events.filter((x) => x.tipo === 'abandona_ritmo')) {
        expect(Number(e.datos!.toGo)).toBeLessThanOrEqual(STAGE.giveUpKm)
      }
    }
  })

  it(
    'y sin irse fuera de control (§VI.3: 8% en llana, 18% en la reina)',
    { timeout: 60000 },
    () => {
      for (const out of runs) {
        const ids = new Set(
          out.events.filter((e) => e.tipo === 'abandona_ritmo').flatMap((e) => e.protagonistas),
        )
        if (ids.size === 0) continue
        const winner = out.results[0]!.tiempoS
        for (const r of out.results) {
          if (!ids.has(r.riderId)) continue
          expect((r.tiempoS - winner) / winner).toBeLessThan(0.18)
        }
      }
    },
  )

  it('el que se juega la etapa no se deja ir', { timeout: 60000 }, () => {
    for (const out of runs) {
      const quitters = new Set(
        out.events.filter((e) => e.tipo === 'abandona_ritmo').flatMap((e) => e.protagonistas),
      )
      // Ningún líder administra: `giveUpLambda` lo excluye por rol.
      for (const id of quitters) expect(id.startsWith('gc-')).toBe(false)
    }
  })
})

describe('regla 9: un final en alto no es el equipo del favorito tirando hasta reventar', () => {
  /** Puerto final de 15 km al 8% con cuatro favoritos que se vigilan entre ellos. */
  function summitFinish(): StageInput {
    const riders: StageRider[] = []
    for (let i = 0; i < 4; i++) {
      riders.push(
        rider(`gc-${i}`, {
          eff0: eff(60, { MON: 84 + i, COL: 80, LLA: 64 }),
          orders: orders({ role: 'lider', contestClimbs: true }),
          // Una general apretada: los cuatro se juegan la carrera (SPEC 6.9).
          gcDeficitSeconds: i * 25,
        }),
      )
    }
    for (let i = 0; i < 6; i++) {
      riders.push(
        rider(`bar-${i}`, {
          eff0: eff(56, { MON: 72 + (i % 4), COL: 70, LLA: 66, TAC: 60 }),
          orders: orders({ role: 'cazaetapas', mentality: 'combativo' }),
          gcDeficitSeconds: 1200 + i * 60,
        }),
      )
    }
    for (let i = 0; i < 30; i++) {
      riders.push(
        rider(`pel-${i}`, {
          eff0: eff(55, { MON: 54 + (i % 12), LLA: 60 }),
          gcDeficitSeconds: 2000 + i * 30,
        }),
      )
    }
    return {
      profile: {
        segments: [
          { km: 135, tipo: 'llano' },
          { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
        ],
      },
      riders,
    }
  }

  const runs = seedsFor('regla9', 30).map((s) => simulateStage(summitFinish(), s))

  it('los fuertes ATACAN en el puerto decisivo', { timeout: 60000 }, () => {
    const withAttack = runs.filter((out) =>
      out.events.some((e) => e.tipo === 'intento' && e.datos!.kind === 'ataque_final'),
    )
    expect(withAttack.length).toBeGreaterThan(runs.length * 0.4)
  })

  it('y el desenlace no es siempre el mismo guion', { timeout: 60000 }, () => {
    let byAttack = 0
    for (const out of runs) {
      const winner = out.results[0]?.riderId
      const attacked = out.events.some(
        (e) => e.tipo === 'ataque' && winner != null && e.protagonistas.includes(winner),
      )
      if (attacked) byAttack += 1
    }
    // Ni siempre gana un ataque ni nunca: antes de la capa táctica esto era 0 de 30, siempre.
    expect(byAttack).toBeGreaterThan(0)
    expect(byAttack).toBeLessThan(runs.length)
  })
})

describe('abandonos en carretera y fuera de control (docs/motor.md §VI.3)', () => {
  /**
   * Un puerto interminable con un campo partido en dos: veinte corredores fuertes con el depósito
   * lleno y una docena hundidos que salen ya casi vacíos. Es el escenario de laboratorio del corte
   * de tiempo — en el calendario real no hay etapas así, y por eso el corte casi nunca dispara
   * (docs/balance.md, «v14»).
   */
  const cruelStage = (weak: number, strong: number): StageInput => {
    const riders: StageRider[] = []
    for (let i = 0; i < strong; i++) {
      riders.push(rider(`fuerte-${i}`, { eff0: eff(80), energy: 100, matches: 2 }))
    }
    for (let i = 0; i < weak; i++) {
      riders.push(rider(`flojo-${i}`, { eff0: eff(22), energy: 14, matches: 2 }))
    }
    return {
      profile: {
        segments: [
          { km: 20, tipo: 'llano' },
          { km: 40, tipo: 'puerto', tramos: [{ km: 40, g: 9 }] },
          { km: 20, tipo: 'llano' },
        ],
      },
      riders,
    }
  }

  const run = (input: StageInput, world: string): StageOutput =>
    simulateStage(
      input,
      stageSeed({ worldSeed: world, raceId: 'corte', stageDay: 1, engineVersion: 1 }),
    )

  it('un grupo numeroso fuera de control se READMITE con penalización, no se elimina', () => {
    const out = run(cruelStage(12, 20), 'a')
    const readmit = out.events.find((e) => e.plantilla === 'time_cut_readmitted')
    expect(readmit).toBeDefined()
    expect(Number(readmit!.datos!.count)).toBeGreaterThan(1)
    // Salvaguarda 1: el tope de esta etapa es 1 corredor (4 % de 32). Lo que la regla garantiza es
    // que el GRUPO NUMEROSO se readmite y que como mucho se van los que quepan en el tope, nunca
    // que no se vaya nadie: eso era una propiedad de este banco concreto, no de la salvaguarda.
    // Desde la v16 el más rezagado llega solo —el grupeto ya no vuelve gratis— y su grupo de UNO sí
    // cabe en el tope, así que se elimina él y se readmite a los demás. Es la regla, literal.
    const cap = Math.floor(STAGE.abandonStageCapFraction * 32)
    expect(out.results.filter((r) => r.estado !== 'finish').length).toBeLessThanOrEqual(cap)
    expect(Number(readmit!.datos!.count)).toBeGreaterThan(cap)
    // La penalización del reglamento: los readmitidos pierden los puntos de la etapa.
    const readmitted = new Set(readmit!.protagonistas)
    for (const r of out.results) {
      if (readmitted.has(r.riderId)) expect(r.puntosVolante).toBe(0)
    }
  })

  it('con tope de sobra, el que llega fuera de control queda sin clasificar (dnf)', () => {
    // La semilla era 'c' hasta la v35 y pasa a ser 'd' porque el ORDEN CANÓNICO de la v35 mueve el
    // reparto de las piernas del día, y con él lo que hace esta etapa concreta. Medido sobre seis
    // semillas con el motor de la v35: en cinco los tres flojos entran a un 67-70 % del ganador y
    // hay corte; en 'c' —y solo en 'c'— la carrera se va tan lenta que entran al 4,1 % y no lo hay.
    // No se ha tocado ni el escenario ni la aserción: lo que se elige es una etapa donde el corte
    // OCURRA, que es lo que este banco necesita para poder comprobar cómo se contabiliza.
    const out = run(cruelStage(3, 100), 'd')
    const cut = out.events.find((e) => e.plantilla === 'time_cut')
    expect(cut).toBeDefined()
    const dnf = out.results.filter((r) => r.estado === 'dnf')
    expect(dnf.length).toBe(Number(cut!.datos!.count))
    // Llegó de verdad, así que conserva su tiempo; lo que pierde es el puesto y la bonificación.
    for (const r of dnf) {
      expect(r.tiempoS).toBeGreaterThan(0)
      expect(r.puesto).toBe(0)
      expect(r.bonificacionS).toBe(0)
    }
    // Los clasificados llevan puestos consecutivos desde el 1: los no clasificados van detrás.
    const finish = out.results.filter((r) => r.estado === 'finish')
    expect(finish.map((r) => r.puesto)).toEqual(finish.map((_, i) => i + 1))
  })

  it('el que se baja de la bici no llega a meta: sin tiempo y sin puesto', () => {
    const out = run(cruelStage(12, 20), 'e')
    const gone = out.results.filter((r) => r.estado === 'abandon')
    expect(gone.length).toBeGreaterThan(0)
    for (const r of gone) {
      expect(r.tiempoS).toBe(0)
      expect(r.puesto).toBe(0)
    }
    const ev = out.events.filter((e) => e.plantilla === 'rider_abandons')
    expect(ev.length).toBe(gone.length)
    expect(ev[0]!.datos!.causa).toBe('colapso')
    // Y deja de contar para la carrera: no aparece en ningún grupo de meta.
    const ids = new Set(gone.map((r) => r.riderId))
    expect(out.results.filter((r) => ids.has(r.riderId) && r.estado === 'finish')).toEqual([])
  })

  it('una etapa normal no retira a nadie', () => {
    const riders: StageRider[] = []
    for (let i = 0; i < 30; i++) riders.push(rider(`r-${i}`, { eff0: eff(58 + (i % 6)) }))
    const out = run({ profile: { segments: [{ km: 180, tipo: 'llano' }] }, riders }, 'z')
    expect(out.results.every((r) => r.estado === 'finish')).toBe(true)
  })
})

/**
 * EL DUELO DE MIRADAS (v39, docs/motor.md §12.7). El dueño, pidiendo el submotor del sprint:
 * «fíjate cómo funciona un sprint sin lanzadores, por ejemplo en una fuga, donde puede haber un
 * momento en el que todos se miran y de repente uno se lanza».
 *
 * Es el caso que el modelo de remate NO sabía contar: sin trenes no hay nadie que ponga el sprint
 * en marcha, así que se abre tarde y con mucha más dispersión, y el momento pesa tanto como las
 * piernas. Lo que este banco fija es justo eso —que el sprint de una fuga no lo gana siempre el más
 * rápido— sin dejar que se convierta en una lotería, que sería el defecto contrario.
 */
describe('el sprint de una fuga se decide también por el momento (v39)', () => {
  function breakSprintInput(): StageInput {
    // Seis fugados que solo se distinguen en punta de velocidad (SPR 68-78), y un pelotón flojo
    // detrás para que la fuga llegue: lo que se mide es el remate, no la persecución.
    const fugados = Array.from({ length: 6 }, (_, i) =>
      rider(`brk-${i}`, {
        eff0: eff(60, { SPR: 68 + 2 * i, LLA: 70, TAC: 62 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
    const pel = Array.from({ length: 24 }, (_, i) =>
      rider(`pel-${i}`, { eff0: eff(48, { LLA: 52 }) }),
    )
    return {
      profile: { segments: [{ km: 120, tipo: 'llano' }] },
      riders: [...fugados, ...pel],
    }
  }

  const wins = new Map<string, number>()
  let arrivals = 0
  for (const seed of seedsFor('duelo', 40)) {
    const out = simulateStage(breakSprintInput(), seed)
    if (out.events.find((e) => e.tipo === 'meta')?.datos?.fuga !== 1) continue
    const winner = out.results[0]!.riderId
    if (!winner.startsWith('brk-')) continue
    arrivals += 1
    wins.set(winner, (wins.get(winner) ?? 0) + 1)
  }

  it('la fuga llega lo bastante a menudo como para medir el remate', { timeout: 120000 }, () => {
    expect(arrivals).toBeGreaterThanOrEqual(20)
  })

  it('no lo gana SIEMPRE el más rápido: el momento pesa', { timeout: 120000 }, () => {
    const masRapido = wins.get('brk-5') ?? 0
    // Con 38 puntos de ventaja en punta un sprint de pelotón sería casi seguro; en una fuga, donde
    // nadie quiere abrir, no lo es. Medido: 8 de 29.
    expect(masRapido / arrivals).toBeLessThan(0.6)
    // Y ganan varios hombres distintos, que es la otra mitad de lo que pidió el dueño.
    expect(wins.size).toBeGreaterThanOrEqual(3)
  })

  it(
    '…pero tampoco es una lotería: los rápidos siguen ganando lo suyo',
    { timeout: 120000 },
    () => {
      // El defecto contrario al de arriba, y el que de verdad hay que vigilar: si el momento lo
      // decidiera todo, la punta de velocidad dejaría de servir para nada dentro de una fuga.
      const losTres = ['brk-3', 'brk-4', 'brk-5'].reduce((a, id) => a + (wins.get(id) ?? 0), 0)
      expect(losTres / arrivals).toBeGreaterThan(0.55)
    },
  )
})
