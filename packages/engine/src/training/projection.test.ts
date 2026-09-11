import { ARCHETYPE_CARD, type TrainingChoice, blockWeek, sessionTss } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { applyDailyLoad } from '../banister.js'
import { arrivalLabel, planTss, projectLoad } from './projection.js'

/**
 * LA PROYECCIÓN DEL PLAN (docs/entrenamiento.md §5.3 y §5.4, paso 11).
 *
 * La prueba que de verdad justifica este fichero es la primera: la proyección tiene que coincidir
 * **dígito a dígito** con lo que hará el tick. Vive en `packages/engine` precisamente para que este
 * test se pueda escribir; desde `apps/web` habría que comparar contra una copia del modelo, y una
 * copia que se compara consigo misma no demuestra nada.
 */

const semana = (
  bloque: Parameters<typeof blockWeek>[0],
  arquetipo: keyof typeof ARCHETYPE_CARD,
): TrainingChoice[] => Array.from({ length: 7 }, (_, d) => blockWeek(bloque, arquetipo, d))

/** Encadena semanas de bloques y devuelve el último día, que es el que se mira. */
const tras = (
  bloques: Parameters<typeof blockWeek>[0][],
  arquetipo: keyof typeof ARCHETYPE_CARD,
) => {
  let estado = { ctl: 70, atl: 70 }
  let ultimo = { day: 0, ctl: 70, atl: 70, tsb: 0, tss: 0 }
  for (const b of bloques) {
    const curva = projectLoad(estado, semana(b, arquetipo), 60)
    ultimo = curva[curva.length - 1]!
    estado = { ctl: ultimo.ctl, atl: ultimo.atl }
  }
  return ultimo
}

describe('engine: la proyección de carga es el mismo Banister que el tick', () => {
  it('COINCIDE CON `applyDailyLoad` día a día, que es su única razón de existir', () => {
    const plan = semana('construccion', 'escalada')
    const proyectada = projectLoad({ ctl: 70, atl: 68 }, plan, 60)
    // La misma cuenta hecha a mano, con la función del motor y nada más.
    let ctl = 70
    let atl = 68
    for (let i = 0; i < plan.length; i++) {
      const paso = applyDailyLoad({ ctl, atl }, sessionTss(plan[i]!), 60)
      ctl = paso.ctl
      atl = paso.atl
      expect(proyectada[i]!.ctl).toBe(ctl)
      expect(proyectada[i]!.atl).toBe(atl)
    }
  })

  it('un plan vacío no proyecta nada, y no revienta', () => {
    expect(projectLoad({ ctl: 70, atl: 68 }, [], 60)).toEqual([])
  })

  it('EL MISMO PLAN NO LLEGA IGUAL A DOS CORREDORES: el REC decide', () => {
    // Es lo que la pantalla tiene que enseñar y hoy no enseña. Quien recupera rápido llega más
    // fresco del mismo mes de entrenamiento, y por eso puede permitirse afinar más corto.
    const plan = [...semana('construccion', 'escalada'), ...semana('construccion', 'escalada')]
    const lento = projectLoad({ ctl: 70, atl: 70 }, plan, 35)
    const rapido = projectLoad({ ctl: 70, atl: 70 }, plan, 85)
    const ultimo = plan.length - 1
    expect(`el que recupera llega más fresco: ${rapido[ultimo]!.tsb > lento[ultimo]!.tsb}`).toBe(
      'el que recupera llega más fresco: true',
    )
  })
})

describe('engine: los bloques hacen lo que su columna promete', () => {
  /**
   * ESTE TEST ES EL QUE CIERRA §5.4. El diseño corrigió el bloque de `afinado` —el viernes pasó de
   * `E suave` a `descanso_activo`— porque tal como estaba escrito sumaba entre un 10 y un 35 % más
   * de carga que la que su propia columna decía. La corrección se comprueba aquí **por el TSB del
   * domingo**, no por la suma de TSS: el TSS es la entrada, y lo que el bloque promete es la
   * llegada.
   */
  it('una semana de afinado deja el domingo en el +5/+15 QUE §5.4 PIDE', () => {
    // El régimen de temporada de verdad: cuatro semanas de construcción y una de específico detrás.
    // Partir de `ctl 70 / atl 70` a secas da un corredor que ya venía fresco, y entonces la prueba
    // mide el punto de partida y no el bloque.
    for (const arquetipo of Object.keys(ARCHETYPE_CARD) as (keyof typeof ARCHETYPE_CARD)[]) {
      const domingo = tras(
        ['construccion', 'construccion', 'construccion', 'construccion', 'especifico', 'afinado'],
        arquetipo,
      )
      expect(
        `${arquetipo}: ${domingo.tsb >= 5 && domingo.tsb <= 15} (${domingo.tsb.toFixed(1)})`,
      ).toBe(`${arquetipo}: true (${domingo.tsb.toFixed(1)})`)
      expect(`${arquetipo}: ${arrivalLabel(domingo.tsb)}`).toBe(`${arquetipo}: perfecto`)
    }
  })

  it('la construcción CARGA y el afinado DESCARGA, que es toda la gracia de tener bloques', () => {
    const construir = projectLoad({ ctl: 70, atl: 70 }, semana('construccion', 'escalada'), 60)
    const afinar = projectLoad({ ctl: 70, atl: 70 }, semana('afinado', 'escalada'), 60)
    const final = (c: ReturnType<typeof projectLoad>): number => c[c.length - 1]!.tsb
    expect(`construir hunde el depósito: ${final(construir) < 0}`).toBe(
      'construir hunde el depósito: true',
    )
    expect(`afinar lo llena: ${final(afinar) > final(construir)}`).toBe('afinar lo llena: true')
  })

  /**
   * EL BLOQUE MÁS LIGERO TIENE QUE SER EL MÁS LIGERO **PARA LOS OCHO**, y no lo era.
   *
   * La carta no cuesta lo mismo a todo el mundo —`puertos` 115 TSS, `bajada_paves` 70—, así que una
   * semana montada sobre tres cartas valía 450 para un escalador y 315 para un clasicómano. Con la
   * tabla literal de §5.4, el `afinado` de un clasicómano salía MÁS PESADO que su `especifico`: el
   * orden de los bloques se invertía para dos de los ocho, y el jugador que eligiera «afinar» habría
   * cargado más. Se nivela con el fondo del martes del específico.
   */
  it('construcción > específico > afinado en TSS, para los OCHO arquetipos', () => {
    for (const arquetipo of Object.keys(ARCHETYPE_CARD) as (keyof typeof ARCHETYPE_CARD)[]) {
      const con = planTss(semana('construccion', arquetipo))
      const esp = planTss(semana('especifico', arquetipo))
      const afi = planTss(semana('afinado', arquetipo))
      expect(`${arquetipo}: ${con > esp && esp > afi} (${con}/${esp}/${afi})`).toBe(
        `${arquetipo}: true (${con}/${esp}/${afi})`,
      )
    }
  })

  it('la recuperación es el bloque más ligero de todos, que para eso está', () => {
    for (const arquetipo of Object.keys(ARCHETYPE_CARD) as (keyof typeof ARCHETYPE_CARD)[]) {
      const rec = planTss(semana('recuperacion', arquetipo))
      const afi = planTss(semana('afinado', arquetipo))
      expect(`${arquetipo}: ${rec < afi} (${rec} < ${afi})`).toBe(
        `${arquetipo}: true (${rec} < ${afi})`,
      )
    }
  })

  it('la intensidad del bloque NO puede deshacer las aperturas del sábado', () => {
    // El sábado del afinado va suave pase lo que pase: si un `fuerte` pudiera subirlo, el afinado
    // dejaría de afinar, que es el defecto que este paso acaba de arreglar.
    const fuerte = blockWeek('afinado', 'escalada', 5, null, 'fuerte')
    expect(fuerte.intensity).toBe('suave')
    // Y donde SÍ manda, manda: el lunes del afinado sube con el bloque.
    expect(blockWeek('afinado', 'escalada', 0, null, 'fuerte').intensity).toBe('fuerte')
  })

  it('el énfasis tapa el agujero que el jugador pida, no la carta', () => {
    // Un escalador que quiere trabajar el esprint: su lunes de específico deja de ser `puertos`.
    expect(blockWeek('especifico', 'escalada', 0).session).toBe('puertos')
    expect(blockWeek('especifico', 'escalada', 0, 'SPR').session).toBe('sprint')
  })

  it('la construcción manda al puerto a quien vive de subir y al muro al resto', () => {
    expect(blockWeek('construccion', 'escalada', 3).session).toBe('puertos')
    expect(blockWeek('construccion', 'gregario', 3).session).toBe('puertos')
    expect(blockWeek('construccion', 'velocidad', 3).session).toBe('muros')
  })
})

describe('engine: cómo vas a llegar, en una palabra', () => {
  it('los cortes son los del `tsbFactor`, no números redondos inventados', () => {
    expect(arrivalLabel(30)).toBe('oxidado')
    expect(arrivalLabel(10)).toBe('perfecto')
    expect(arrivalLabel(5)).toBe('perfecto')
    expect(arrivalLabel(0)).toBe('bien')
    expect(arrivalLabel(-10)).toBe('bien')
    expect(arrivalLabel(-20)).toBe('cargado')
    expect(arrivalLabel(-40)).toBe('fundido')
  })

  it('«fundido» empieza donde el motor deja de dar rendimiento, no antes', () => {
    // `tsbFactor(-35) = 0`: por debajo de ahí la carrera ya no devuelve nada, y la palabra tiene que
    // decirlo. Si el corte estuviera en −20 la pantalla asustaría con un TSB perfectamente normal
    // de una semana de construcción.
    expect(arrivalLabel(-31)).toBe('fundido')
    expect(arrivalLabel(-30)).toBe('cargado')
  })
})
