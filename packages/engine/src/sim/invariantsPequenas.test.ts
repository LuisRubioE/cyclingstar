/**
 * Invariantes de las CARRERAS PEQUEÑAS con forma de producción (SPEC 6.17). Salieron de
 * `invariants.test.ts` en la v83 para que la matriz del CI pueda correrlos en paralelo: ver la nota
 * de reparto allí.
 *
 * Aquí vive la prueba más cara del banco entero: «el mejor rematador gana bastantes, y no todas».
 */
import { describe, expect, it } from 'vitest'
import { SMALL_TOURS, type SmallTourStats, analyzeSmallTours } from './smallTours.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { TARGETS, type Target } from './targets.js'

/** Comprueba un estadístico contra su rango objetivo compartido. */
function expectInRange(value: number, target: Target): void {
  expect(value).toBeGreaterThanOrEqual(target.min)
  expect(value).toBeLessThanOrEqual(target.max)
}

/**
 * LAS CARRERAS PEQUEÑAS (v23, `sim/smallTours.ts`). El banco con FORMA DE PRODUCCIÓN.
 *
 * `flat.bestSprinterWinPct` mide `llana-180`, que monta tres sprinters con SPR 84, 85 y 86: con un
 * empate a tres el ganador lo decide el ruido, sale 36 % y pasa su 30-45 % sin enterarse de nada.
 * En producción los campos no tienen esa forma —el mejor le saca 2-6 puntos al segundo— y Race
 * Arabia dio cinco victorias del mismo corredor en cinco etapas mientras CI seguía en verde. Y la
 * pregunta es de CARRERA, no de etapa: hace falta el mismo campo corriendo las cinco seguidas.
 */
describe('las carreras PEQUEÑAS con forma de producción (v23)', () => {
  // Diez carreras de 1 a 9 etapas con 126-176 corredores son ~2 minutos: se corren UNA vez y las
  // comparten todos los invariantes que salen de ellas, como hacen `grandTour` y `realQueens`.
  let shared: SmallTourStats | null = null
  /**
   * OCHO CORRIDAS POR CARRERA Y NO CUATRO (v41). Con cuatro, la prueba de la foto de meta mide sobre
   * unos NOVENTA pares y el suelo de su banda —el 15 % de «dos llegadas agrupadas de la misma
   * carrera las gana el mismo»— queda a menos de UN par de distancia: medido, 14,89 % con cuatro
   * corridas y 16,9 % con ocho, sin que el motor cambie. Un listón que se cruza con un par no mide
   * nada.
   *
   * Y la dirección importa: lo que se sube es la MUESTRA, no se baja el suelo. Ese 15 % es la línea
   * de la lotería —con 7 a 17 rematadores nombrados, repartir al azar da un 6-14 %— y describe una
   * propiedad del ciclismo, no una preferencia. Cuesta unos minutos más de banco, y se pagan.
   *
   * …Y DOCE Y NO OCHO DESDE EL PASO 9 DE E1 (v87), por la misma razón y en la misma dirección. Con el
   * calendario de la gramática, `bestSprinterWinPct` mide 21,5 % con ocho corridas y 26,3 % con doce
   * (el pareado de docs/balance.md, v87 §2: 28,4 % con el calendario viejo, diferencia pareada de
   * -3,2 puntos, dentro del ruido): con ocho, cuatro semillas movían cinco puntos una banda de suelo
   * 25. Doce son las del pareado, así que el banco de CI mide exactamente lo que se anotó. Cuesta
   * medio banco más (de ~11 a ~17 minutos en local), y el reloj de 3.900 s lo cubre.
   */
  const bench = (): SmallTourStats => (shared ??= analyzeSmallTours(12))

  it('el banco cubre formas distintas, y las carreras de la queja están dentro', () => {
    // No es decorado: el defecto se coló porque el banco no tenía ningún campo con esta forma.
    const has = (raceId: string): boolean => SMALL_TOURS.some((t) => t.raceId === raceId)
    expect(has('race-arabia')).toBe(true) // «gana las 5»
    expect(has('race-provence')).toBe(true) // «la e2 y la e3 se parecen demasiado»
    expect(has('race-almeria')).toBe(true) // la fuga que ganó por 4 minutos
    expect(has('race-tramuntana')).toBe(true) // …y la misma historia en montaña, por 38 minutos
    expect(SMALL_TOURS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(SMALL_TOURS.map((t) => t.raceId)).size).toBe(SMALL_TOURS.length)
    // Y con los tres NIVELES de campo: una continental y una WorldTour no tienen la misma
    // dispersión de SPR, que es justo de lo que va este banco. Se lee del calendario y no
    // corriendo las carreras: esta comprobación tiene que ser barata.
    const levels = new Set(
      SMALL_TOURS.map((t) => SEASON_CALENDAR.find((r) => r.id === t.raceId)?.level),
    )
    expect(levels.has(undefined)).toBe(false)
    expect(levels.size).toBeGreaterThanOrEqual(3)
  })

  it('el mejor rematador gana bastantes, y no todas', { timeout: 3900000 }, () => {
    const stats = bench()
    expect(stats.share.races).toBe(SMALL_TOURS.length * stats.runsPerRace)
    // …y el campo tiene un mejor sprinter CLARO, que es la premisa del objetivo: si el banco
    // acabara midiendo un empate a tres, mediría lo mismo que `llana-180` y no serviría de nada.
    expect(stats.share.medianEdge).toBeGreaterThan(1)
    expectInRange(stats.share.bestSprinterWinPct, TARGETS.smallTours.bestSprinterWinPct)
  })

  it('…y no se lleva TODAS las llegadas agrupadas de la carrera', { timeout: 300000 }, () => {
    const stats = bench()
    // Sobre carreras con tres o más llegadas agrupadas: llevarse dos de dos no es la queja.
    expect(stats.share.sweepableRaces).toBeGreaterThanOrEqual(10)
    expectInRange(stats.share.sweepPct, TARGETS.smallTours.sweepPct)
  })

  it('una LLANA sigue metiendo al pelotón entero', { timeout: 300000 }, () => {
    // Objetivo de NO ROMPER: el 99 % de producción no es el defecto, es lo que hace una llana de
    // verdad. Está aquí para que arreglar la media y la reina no se pague partiendo la llana.
    expectInRange(bench().shapes.llana.medianWinnerGroupPct, TARGETS.smallTours.flatWinnerGroupPct)
  })

  it('una MEDIA se parte, y no trae al campo entero al mismo segundo', { timeout: 300000 }, () => {
    const media = bench().shapes.media
    expect(media.stages).toBeGreaterThan(40)
    expectInRange(media.medianGroups, TARGETS.smallTours.mediaGroups)
    expectInRange(media.oneGroupPct, TARGETS.smallTours.mediaOneGroupPct)
  })

  it('ninguna fuga gana una llana por cuatro minutos', { timeout: 300000 }, () => {
    // La alarma de peor caso: en producción hubo victorias en solitario por 240 s y por 193 s, y
    // eso no es una fuga que aguanta, es un pelotón que no persiguió (docs/balance.md «v23»).
    const margins = bench().flatMargins
    expect(margins.wins).toBeGreaterThan(0)
    expectInRange(margins.maxMarginS, TARGETS.smallTours.flatMoveWorstMarginS)
  })

  it('la foto de meta no es la misma todos los días', { timeout: 300000 }, () => {
    // v24. La deuda que la v23 dejó nombrada en su §10, ahora con banda. Se mide sobre PARES de
    // llegadas agrupadas de la misma carrera —lo único comparable: el 1,0 «sano» que producción
    // daba en Race Colombia salía de comparar una llegada de 130 con una de 58 y con una crono, y
    // comparando agrupada contra agrupada Colombia repite 2,0 y Arabia 3,3, no 1,0 contra 3,3.
    const photo = bench().photo
    expect(photo.pairs).toBeGreaterThan(50)
    expectInRange(photo.repeatTopFive, TARGETS.smallTours.photoRepeatTopFive)
    // …y NINGUNA carrera suelta se clava, que es la lección de la tanda: el promedio de diez
    // carreras se traga a la que está rota, igual que `sweepPct` se tragaba el barrido de Arabia.
    expectInRange(photo.worstRepeatTopFive, TARGETS.smallTours.worstRacePhotoRepeat)
    // El número que de verdad separa una carrera sana de una clavada: en producción, 0 % en
    // Colombia y 100 % en Arabia.
    expectInRange(photo.sameWinnerPct, TARGETS.smallTours.sameWinnerPairPct)
  })

  it('la ley de velocidad no se ha movido: el ganador rueda como un profesional', () => {
    // GUARDARRAÍL, no objetivo de esta tanda. Las medianas del ganador en producción por tipo de
    // etapa —llana 44,8 · media 42,4 · reina 35,8 km/h— están todas dentro del rango real, así que
    // la ley de velocidad (v19) está bien. Lo que había que arreglar es cómo se REPARTE el campo;
    // si una calibración moviera estas medianas, la palanca sería la equivocada.
    const { llana, media, reina } = bench().shapes
    expect(llana.medianWinnerKmh).toBeGreaterThan(media.medianWinnerKmh)
    expect(media.medianWinnerKmh).toBeGreaterThan(reina.medianWinnerKmh)
    expect(llana.medianWinnerKmh).toBeLessThanOrEqual(48)
    expect(reina.medianWinnerKmh).toBeGreaterThanOrEqual(32)
  })
})
