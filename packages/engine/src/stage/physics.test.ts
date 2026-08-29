import { describe, expect, it } from 'vitest'
import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
import {
  blockCost,
  blockPerfil,
  blockSeconds,
  costBase,
  draftMax,
  droppedCommit,
  effNow,
  erosion,
  majorityOnTheRoad,
  matchCount,
  maxMatchCount,
  gutterShelter,
  relayRotation,
  shelterOf,
  stepSpeed,
  targetSpeed,
  vRef,
} from './physics.js'
import { STAGE } from '../constants.js'
import type { Block } from './types.js'

/** eff0 uniforme de valor `v` para todos los atributos, salvo los que se sobreescriban. */
function eff(v: number, over: Partial<Record<Attribute, number>> = {}): Record<Attribute, number> {
  return {
    RES: v,
    REC: v,
    LLA: v,
    MON: v,
    COL: v,
    CRI: v,
    SPR: v,
    DES: v,
    PAV: v,
    TAC: v,
    ...over,
  }
}

const block = (tipo: Block['tipo'], g: number, estrellas = 0): Block => ({ tipo, g, estrellas })

describe('ley de velocidad (6.4)', () => {
  it('en subida mezcla escalada y llano según w(g)', () => {
    const climber = eff(40, { MON: 80, LLA: 40 })
    // g = 8 -> w = clamp((8-2)/6) = 1.0: manda la escalada.
    expect(blockPerfil(climber, block('subida', 8))).toBeCloseTo(80)
    // g = 2 -> w = 0.15: casi todo llano.
    expect(blockPerfil(climber, block('subida', 2))).toBeCloseTo(0.15 * 80 + 0.85 * 40)
  })

  it('en muros usa COL en vez de MON', () => {
    const puncheur = eff(40, { MON: 50, COL: 90 })
    expect(blockPerfil(puncheur, block('subida', 10), true)).toBeCloseTo(90)
  })

  it('vRef cae con la pendiente y satura en los extremos', () => {
    expect(vRef(0, 'llano')).toBe(STAGE.vRefFlat)
    // Subida hiperbólica A/(g+k): la velocidad va como el inverso de la pendiente, de modo que la
    // VAM sale sola en el rango real a cualquier pendiente (docs/motor.md §3-bis-c).
    expect(vRef(8, 'subida')).toBeCloseTo(188 / 11.5)
    expect(vRef(12, 'subida')).toBeCloseTo(188 / 15.5)
    expect(vRef(40, 'subida')).toBe(STAGE.vRefClimbMin) // saturado al mínimo
    expect(vRef(-6, 'descenso')).toBe(55)
  })

  it('la VAM del pelotón de cabeza cae en el rango real a cualquier pendiente', () => {
    // VAM (m/h) = v (km/h) · 1000 · g/100. Referencia: los punteros de una etapa reina (P75 86)
    // subiendo al compromiso de puerto decisivo. Real en el WorldTour: 1.500-1.800 m/h en puertos
    // sostenidos del 8 al 12%. Por encima del 12% ya no hay puertos largos —son muros de pocos
    // minutos, donde manda COL— y ahí la VAM real sí sube de 1.800, así que no se acota.
    for (const g of [8, 10, 12]) {
      const v = targetSpeed(block('subida', g), 86, STAGE.climbRaceCommit)
      const vam = v * 10 * g
      expect(vam).toBeGreaterThanOrEqual(1500)
      expect(vam).toBeLessThanOrEqual(1800)
    }
  })
})

describe('inercia (6.4)', () => {
  it('la coronación (14 -> 55 km/h) toma de 250 a 400 metros', () => {
    // Crest realista: la pendiente se inclina en 2-3 bloques (-1, -3, -6...).
    const gradients = [-1, -3, -6, -6, -6, -6]
    let v = 14
    let metros = 0
    for (const g of gradients) {
      if (v >= 54.5) break
      const dt = blockSeconds(v)
      v = stepSpeed(v, 55, g, dt)
      metros += 100
    }
    expect(metros).toBeGreaterThanOrEqual(250)
    expect(metros).toBeLessThanOrEqual(400)
  })

  it('una rampa del 8% embestida a 45 km/h desangra la velocidad en bloque y medio', () => {
    let v = 45
    let bloques = 0
    // vObj de la rampa ~ 22 km/h.
    while (v > 23 && bloques < 5) {
      const dt = blockSeconds(v)
      v = stepSpeed(v, 22, 8, dt)
      bloques += 1
    }
    expect(bloques).toBeLessThanOrEqual(2) // desangre casi inmediato: bloque y medio
    expect(v).toBeLessThanOrEqual(23)
  })

  it('frenar es más rápido que acelerar (asimetría de las cotas)', () => {
    const dt = 1
    const acelera = stepSpeed(30, 60, 0, dt) - 30 // limitado por ACC_PEDAL = 0.4
    const frena = 30 - stepSpeed(30, 0, 0, dt) // limitado por DEC_MAX = 3.0
    expect(frena).toBeGreaterThan(acelera)
  })

  it('el cerillo activo multiplica la aceleración por 2.5', () => {
    const dt = 1
    const sin = stepSpeed(30, 60, 0, dt) - 30
    const con = stepSpeed(30, 60, 0, dt, { matchActive: true }) - 30
    expect(con).toBeCloseTo(sin * 2.5)
  })

  it('un grupo comprometido rueda más rápido que uno a tempo', () => {
    const b = block('llano', 0)
    expect(targetSpeed(b, 75, 1)).toBeGreaterThan(targetSpeed(b, 75, 0))
    // A P75 = 75 (la referencia) y ritmo(0) = rhythmBase, la objetivo es rhythmBase·vRef.
    expect(targetSpeed(b, 75, 0)).toBeCloseTo(STAGE.rhythmBase * STAGE.vRefFlat)
  })
})

describe('coste y drafting (6.5)', () => {
  it('subir cuesta más que rodar en llano, y bajar cuesta poco', () => {
    expect(costBase(block('subida', 8))).toBeGreaterThan(costBase(block('llano', 0)))
    expect(costBase(block('descenso', -6))).toBeLessThan(costBase(block('llano', 0)))
  })

  it('el pavés cuesta más cuantas más estrellas de dureza', () => {
    expect(costBase(block('paves', 0, 5))).toBeGreaterThan(costBase(block('paves', 0, 1)))
  })

  it('el rebufo abarata el bloque; ir protegido gasta menos que ir solo', () => {
    const b = block('llano', 0)
    const protegido = blockCost(b, 0.5, false, 8)
    const solo = blockCost(b, 0.5, true, 1)
    expect(protegido).toBeLessThan(solo)
  })

  it('el rebufo mengua en subida', () => {
    expect(draftMax(block('subida', 8))).toBeLessThan(draftMax(block('llano', 0)))
  })
})

describe('o tiras o no tiras (v34, SPEC 6.5)', () => {
  it('el que no tira va a rueda, tire quien tire y sean los que sean', () => {
    expect(shelterOf(false, 1)).toBe(STAGE.shelterProtected)
    expect(shelterOf(false, 8)).toBe(STAGE.shelterProtected)
  })

  it('el que tira SIN NADIE QUE LE RELEVE paga el viento entero', () => {
    // Es el caso n = 1 de la misma regla, no un estado aparte: el escapado en solitario, el
    // descolgado que rueda solo y el corredor de una contrarreloj son el mismo hombre.
    expect(shelterOf(true, 1)).toBe(STAGE.shelterAlone)
  })

  it('y duele menos cuanto más grande es la rotación, sin llegar nunca a ir a rueda', () => {
    const dos = shelterOf(true, 2)
    const seis = shelterOf(true, 6)
    const veinte = shelterOf(true, 20)
    expect(dos).toBeLessThan(seis)
    expect(seis).toBeLessThan(veinte)
    expect(veinte).toBeLessThan(STAGE.shelterProtected)
    // Uno de dos da la cara la mitad del tiempo: la mitad del rebufo de ir a rueda.
    expect(dos).toBeCloseTo(STAGE.shelterProtected / 2, 12)
  })

  it('LA FACTURA DEL GRUPO VALE UN HOMBRE, sea cual sea el tamaño de la rotación', () => {
    // El invariante que sostiene toda la regla, y la razón de que el tamaño de la rotación decida
    // entre quiénes se reparte el viento y nunca cuánto viento hay: en cada instante hay UN hombre
    // dando la cara y el resto va a rueda.
    for (const n of [1, 2, 3, 6, 8, 20, 176]) {
      const factura = n * ((STAGE.shelterProtected - shelterOf(true, n)) / STAGE.shelterProtected)
      expect(factura).toBeCloseTo(1, 12)
    }
  })
})

describe('la cuneta del abanico (v41)', () => {
  it('mientras el grupo CABE en la fila, ir a rueda es ir a rueda', () => {
    expect(gutterShelter(12, 12)).toBe(STAGE.shelterProtected)
    expect(gutterShelter(5, 12)).toBe(STAGE.shelterProtected)
  })

  it('y en cuanto no cabe, el asfalto se reparte entre los que son', () => {
    // Un grupo que dobla la capacidad de la carretera arropa a la mitad de los suyos; uno que la
    // cuadruplica, a un cuarto. No hay escalón: el que sobra no es «el 13.º», es la proporción.
    expect(gutterShelter(24, 12)).toBeCloseTo(STAGE.shelterProtected / 2, 12)
    expect(gutterShelter(48, 12)).toBeCloseTo(STAGE.shelterProtected / 4, 12)
    expect(gutterShelter(159, 13)).toBeLessThan(STAGE.shelterProtected / 10)
  })

  it('y el que rota en una fila que no cabe tampoco encuentra dónde meterse', () => {
    // El abrigo entra en los DOS estados de `shelterOf`, no solo en el del que va a rueda: cuando
    // sales del relevo, detrás del último que da la cara está la cuneta.
    const arropo = gutterShelter(60, 12)
    expect(shelterOf(false, 8, arropo)).toBe(arropo)
    expect(shelterOf(true, 8, arropo)).toBeLessThan(shelterOf(true, 8))
    // Y el que va solo paga el viento entero igual: n = 1 no depende del abrigo de nadie.
    expect(shelterOf(true, 1, arropo)).toBe(STAGE.shelterAlone)
  })

  it('cuesta más rodar en la cuneta que a rueda, y el que tira lo nota menos', () => {
    const llano = block('llano', 0)
    const arropo = gutterShelter(159, 13)
    const aRueda = blockCost(llano, 0.8, false, 12)
    const enCuneta = blockCost(llano, 0.8, false, 12, STAGE.dx, arropo)
    expect(enCuneta).toBeGreaterThan(aRueda)
    // El que ya estaba dando la cara paga un sobreprecio MENOR en proporción: parte del viento ya
    // lo pagaba. Es lo que hace que un abanico se lleve por delante a los pasajeros y no a los que
    // rotan.
    const tirando = blockCost(llano, 0.8, true, 12)
    const tirandoEnCuneta = blockCost(llano, 0.8, true, 12, STAGE.dx, arropo)
    expect(tirandoEnCuneta / tirando).toBeLessThan(enCuneta / aRueda)
  })
})

describe('cuántos tiran (v34)', () => {
  it('en un grupo grande manda el tope de la carretera, no la fracción de ritmo', () => {
    // El cuarto delantero de un pelotón de 176 son 44 hombres, y en la cabeza no caben 44.
    expect(relayRotation(176, STAGE.pelotonPaceFraction)).toBe(STAGE.relayRotationMax)
  })

  it('en un grupo pequeño manda la fracción, y nunca tira menos de uno', () => {
    expect(relayRotation(6, 0.635)).toBe(4)
    expect(relayRotation(1, 1)).toBe(1)
    expect(relayRotation(3, 0.12)).toBe(1)
  })

  it('nunca pide más relevistas que corredores hay', () => {
    for (let n = 1; n <= 30; n++) expect(relayRotation(n, 1)).toBeLessThanOrEqual(n)
  })
})

describe('el ritmo del descolgado (v16, docs/motor.md §9; v35, el tope de la pelea)', () => {
  const llano = block('llano', 0)
  const puerto = block('subida', 8)
  // Resignado del todo: el grupo de cabeza hace rato que se perdió de vista.
  const lejos = STAGE.shedResignGapSeconds * 2
  // Un grupeto NORMAL: por detrás de un pelotón que le dobla o le triplica en número. Es el caso de
  // toda la vida y el que fija estos invariantes; la mayoría en la carretera se prueba aparte.
  const PEL = 120
  // CONTRA QUÉ SE PELEA (v35). El de delante entra ahora en la cuenta: contra un pelotón lanzado el
  // tope no muerde y todo lo de la v16 sigue en pie; contra uno que rueda a tempo, sí.
  const LANZADO = STAGE.shedFightCommit
  const TEMPO = STAGE.pelotonTempoCommit

  it('el que acaba de soltarse de un pelotón LANZADO va a SU UMBRAL, vaya solo o acompañado', () => {
    // Es el `shedCommit` = 0,82 de toda la vida, y es deliberado que no se haya movido: el que
    // pierde una rueda no se sienta. Lo que cambia es lo que pasa DESPUÉS.
    expect(droppedCommit(llano, 1, 1, 0, PEL, LANZADO)).toBeCloseTo(STAGE.shedFightCommit)
    expect(droppedCommit(puerto, 40, 1, 0, PEL, LANZADO)).toBeCloseTo(STAGE.shedFightCommit)
  })

  it('…pero contra un pelotón que rueda a TEMPO no se pelea a 0,82: el tope lo pone el de delante (v35, v38)', () => {
    // El defecto de la v34: 0,82 es un número absoluto —el ritmo de un pelotón lanzado—, así que un
    // descolgado peleando contra un pelotón a tempo iba SIEMPRE más rápido que él.
    //
    // EN LA v38 ESTE TOPE ADELGAZA: el término de rotación se fue de aquí a la ley de velocidad
    // (`relayPaceEdge`), porque lo que da relevarse es VELOCIDAD y no ganas de pelear. Lo que queda
    // en el tope es lo que siempre debió ser: el ritmo del que va delante, mezclado a precio de
    // rebufo. Que uno solo no le saque nada a un grupo que va a rueda se comprueba abajo, donde ese
    // hecho vive ahora.
    // Y con las piernas ENTERAS el tope ya no muerde, que es el otro cambio de la v38: el suelo de
    // este cálculo es el ritmo que el grupo SOSTIENE, y un hombre entero sostiene su umbral aunque
    // el de delante vaya de paseo. Lo que decide entonces si le come terreno o no es la LEY, no las
    // ganas: la comprobación está abajo, en «el grupo grande rueda más rápido que el que va solo».
    expect(droppedCommit(llano, 1, 1, 0, PEL, TEMPO)).toBeCloseTo(STAGE.shedFightCommit)
    // El tope sigue mordiendo donde siempre debió: en el que ya no puede sostener su umbral.
    const vacio = droppedCommit(llano, 1, 0.3, 0, PEL, TEMPO)
    expect(vacio).toBeLessThan(STAGE.shedFightCommit)
    expect(vacio).toBeGreaterThan(STAGE.shedCommitAlone)
  })

  it('…y en el puerto el tope apenas existe: allí no hay rueda a la que ir (§VI.1 intacto)', () => {
    // Lo que la v35 cobra es rebufo, así que se cobra donde hay rebufo. En una rampa al 8 % el que
    // se suelta sigue peleando a su umbral aunque el pelotón suba a tempo, que es lo que separa una
    // selección de una debacle (el argumento de la v16).
    const enPuerto = droppedCommit(puerto, 1, 1, 0, PEL, TEMPO)
    expect(enPuerto).toBeGreaterThan(0.9 * STAGE.shedFightCommit)
  })

  it('el grupo grande rueda MÁS RÁPIDO que el que va solo: se relevan (v16 → v38, en la LEY)', () => {
    /**
     * Este invariante es de la v16 y sigue siendo cierto; lo que cambia en la v38 es DÓNDE vive.
     * Hasta la v37 se cobraba metiendo la rotación en el COMPROMISO del descolgado —el hombre solo
     * «quería» ir a 0,55 y el autobús a 0,82—, que es una forma rara de decirlo: nadie decide ir más
     * despacio por ir solo, es que no puede. Ahora lo dice la ley de velocidad con el mismo
     * argumento y la misma pieza (`1 − draftMax·shelterOf`), así que se comprueba aquí.
     *
     * Y el compromiso ya NO los distingue, que es justo lo que se quería: los dos pelean igual.
     */
    const mismasPiernas = 70
    const mismoRitmo = 0.8
    const autobus = targetSpeed(llano, mismasPiernas, mismoRitmo, 8)
    const suelto = targetSpeed(llano, mismasPiernas, mismoRitmo, 1)
    expect(autobus).toBeGreaterThan(suelto)
    // El compromiso del descolgado ya no depende del tamaño: lo que depende es lo que da de sí.
    expect(droppedCommit(llano, 40, 1, lejos, PEL, LANZADO)).toBeCloseTo(
      droppedCommit(llano, 1, 1, lejos, PEL, LANZADO),
    )
  })

  it('…pero en el puerto ser cuarenta no sirve de nada: ahí no hay rueda a la que ir (v38, en la LEY)', () => {
    // La otra mitad del invariante de la v16, también mudada a la ley de velocidad. Se cobra a
    // precio de rebufo por construcción —`draftMax` vale 0,42 en el llano y 0,096 en una rampa al
    // 8 %—, así que el grupeto sube tan lento como el que sube solo y en el valle vuelve a rodar
    // como un pelotón. Es el hecho de carretera que ningún parche sabía imitar.
    const ventaja = (b: Block): number =>
      targetSpeed(b, 70, 0.8, 8) / targetSpeed(b, 70, 0.8, 1) - 1
    // Medido: en llano un turno de ocho compra un 8,1 % de velocidad sobre el hombre solo y en una
    // rampa al 8 % solo un 4,0 %, o sea la mitad. No es cero —algo de rueda hay incluso subiendo—
    // pero es la diferencia entre que un grupeto vuelva en el valle y no vuelva en el puerto.
    expect(ventaja(puerto)).toBeGreaterThan(0)
    expect(ventaja(puerto)).toBeLessThan(ventaja(llano) / 1.8)
  })

  it('el grupeto vaciado administra; con las piernas enteras, no', () => {
    expect(droppedCommit(llano, 20, 0, lejos, PEL, LANZADO)).toBeLessThan(
      droppedCommit(llano, 20, 1, lejos, PEL, LANZADO),
    )
  })

  it('…y con MEDIO depósito se pelea igual: la frescura no pesa en la pelea (v16 intacto)', () => {
    // Se probó en la v35 cobrarle la frescura al que pelea EN TODO EL RANGO y se descartó con
    // medida: la brecha 1.º-10.º de la reina se iba de 254 s a 308 s (§VI.1 pide ≤ 300) y la fuga
    // de montaña ganaba el 53 % de las etapas (objetivo 25-45 %). El argumento sigue en pie —la
    // limitación de ir vacío ya la cobra la erosión sobre el P75, y cobrarla dos veces manda al
    // grupeto a cualquiera que pierda una rueda—, así que a media frescura la pelea es la misma.
    expect(droppedCommit(llano, 20, 0.5, 0, PEL, LANZADO)).toBeCloseTo(
      droppedCommit(llano, 20, 1, 0, PEL, LANZADO),
    )
  })

  it('…pero A CERO no se pelea: no hay con qué (v40)', () => {
    // El dueño: «lo de que pelean a tope aunque vaya vacío, arréglalo también, aunque no resuelva
    // el problema final». Y tiene razón: «el que acaba de soltarse va a su umbral aunque vaya
    // vacío» está bien escrito para el que pierde una rueda con medio depósito y es falso para el
    // que está a cero. A cero te sientas y sobrevives.
    //
    // Por qué esto NO es el experimento que la v35 descartó: aquél cobraba la frescura en todo el
    // rango, así que tocaba a CUALQUIERA que perdiese una rueda con las piernas a medias. Éste
    // solo muerde por debajo de `shedFightFreshness`, o sea en el último tercio del depósito, que
    // es donde la frase deja de ser cierta. Por eso la reina y la montaña no se mueven —medido, y
    // es la comprobación que este banco existe para exigir—.
    const vacío = droppedCommit(llano, 20, 0, 0, PEL, LANZADO)
    const entero = droppedCommit(llano, 20, 1, 0, PEL, LANZADO)
    expect(vacío).toBeLessThan(entero)
    // Y no se para: sigue rodando al ritmo que sostiene un grupo, que es el suelo de `able · legs`.
    expect(vacío).toBeGreaterThan(0.4)
  })

  it('se pelea al principio y se resigna al final, sin escalones', () => {
    const gaps = [0, 60, 120, 180, 240, 300, 600]
    const commits = gaps.map((g) => droppedCommit(llano, 8, 0.5, g, PEL, LANZADO))
    for (let i = 1; i < commits.length; i++)
      expect(commits[i]!).toBeLessThanOrEqual(commits[i - 1]!)
    // Y una vez resignado, el ritmo ya no depende del boquete: no hay espiral.
    expect(commits[6]!).toBeCloseTo(commits[5]!)
  })

  it('el tope de la pelea nunca baja del ritmo que el grupo puede SOSTENER', () => {
    // Un autobús detrás de un pelotón parado no se frena para no adelantarlo: `able` es un suelo.
    const autobus = droppedCommit(llano, 60, 1, 0, 4, 0.2)
    expect(autobus).toBeGreaterThan(STAGE.shedCommitAlone)
  })
})

/**
 * LA MAYORÍA EN LA CARRETERA (v17, docs/balance.md «v17»). El defecto que se corrige: `1 − 1/n`
 * satura —0,90 con diez y 0,992 con ciento veintiséis—, así que un PELOTÓN entero se resignaba
 * igual que un rezagado solo, y en Race Colombia e5 ciento veintiséis corredores entraron a 74
 * minutos de cuatro por 47 km de terreno rodador.
 */
describe('la mayoría en la carretera (v17)', () => {
  const llano = block('llano', 0)
  const puerto = block('subida', 8)
  const lejos = STAGE.shedResignGapSeconds * 2
  // El de delante va lanzado: así el tope de la v35 no muerde y esto mide solo la mayoría.
  const LANZADO = STAGE.shedFightCommit
  // El techo de estas cuentas es el 0,82 de siempre: con el de delante LANZADO el tope de la v35
  // no muerde, que es justo lo que aísla el término de la mayoría.
  const TOPE = STAGE.shedFightCommit

  it('126 detrás de 4 NO se resignan: son la carrera, no un grupeto', () => {
    expect(droppedCommit(llano, 126, 0.3, lejos, 4, LANZADO)).toBeCloseTo(TOPE)
  })

  it('…y un grupeto normal detrás de un pelotón entero sigue resignándose igual que en la v16', () => {
    // 40 detrás de 120: la razón es 0,33, muy por debajo de la paridad, así que este término no
    // existe para él. Es la garantía de que la corrección no se lleva por delante al autobús.
    const grupeto = droppedCommit(llano, 40, 0.3, lejos, 120, LANZADO)
    const sinMayoria = droppedCommit(llano, 40, 0.3, lejos, Number.MAX_SAFE_INTEGER, LANZADO)
    expect(grupeto).toBeCloseTo(sinMayoria)
    expect(grupeto).toBeLessThan(TOPE)
  })

  it('la rampa va de «me triplican» a «los triplico», y es continua', () => {
    // Los dos extremos son el MISMO factor leído al derecho y al revés.
    expect(majorityOnTheRoad(10, 30)).toBe(0)
    expect(majorityOnTheRoad(4, 30)).toBe(0)
    expect(majorityOnTheRoad(30, 10)).toBe(1)
    expect(majorityOnTheRoad(90, 10)).toBe(1)
    // …y en la paridad se está a un cuarto del camino, ni grupeto ni pelotón.
    expect(majorityOnTheRoad(10, 10)).toBeCloseTo(0.25)
    const rampa = [4, 10, 14, 18, 22, 26, 30].map((n) =>
      droppedCommit(llano, n, 0.3, lejos, 10, LANZADO),
    )
    for (let i = 1; i < rampa.length; i++) expect(rampa[i]!).toBeGreaterThan(rampa[i - 1]!)
  })

  it('ser mayoría se cobra a precio de REBUFO: en la rampa al 8% apenas salva', () => {
    // El argumento del autobús es de relevos, y en un puerto no hay rueda a la que ir: por eso el
    // grupeto de la etapa reina se resigna EN EL PUERTO casi igual que en la v16. Se mide en
    // FRACCIÓN de lo que había que recorrer hasta el umbral, que es lo que el término reparte.
    const ganaPuerto =
      (droppedCommit(puerto, 126, 0.3, lejos, 4, LANZADO) -
        droppedCommit(puerto, 126, 0.3, lejos, Number.MAX_SAFE_INTEGER, LANZADO)) /
      (TOPE - droppedCommit(puerto, 126, 0.3, lejos, Number.MAX_SAFE_INTEGER, LANZADO))
    const ganaLlano =
      (droppedCommit(llano, 126, 0.3, lejos, 4, LANZADO) -
        droppedCommit(llano, 126, 0.3, lejos, Number.MAX_SAFE_INTEGER, LANZADO)) /
      (TOPE - droppedCommit(llano, 126, 0.3, lejos, Number.MAX_SAFE_INTEGER, LANZADO))
    // En el llano la mayoría se cobra ENTERA (el autobús no se resigna) y en la rampa al 8 % se
    // queda en el rebufo que hay allí arriba: menos de un tercio.
    expect(ganaLlano).toBeCloseTo(1)
    expect(ganaPuerto).toBeLessThan(ganaLlano / 3)
  })
})

describe('cerillos (6.6)', () => {
  it('un corredor completo tiene más cerillos que uno modesto', () => {
    const fuerte = eff(90)
    const flojo = eff(40)
    expect(matchCount(fuerte, 0)).toBeGreaterThan(matchCount(flojo, 0))
  })

  it('llegar reventado (TSB < -25) resta un cerillo, con mínimo de 1', () => {
    const r = eff(90)
    expect(matchCount(r, -30)).toBe(matchCount(r, 0) - 1)
    expect(matchCount(eff(20), -30, true)).toBeGreaterThanOrEqual(1)
  })
})

describe('erosión (6.7)', () => {
  it('sin vaciar apreciablemente no hay erosión', () => {
    expect(erosion(95, 100, 50)).toBe(0)
  })

  it('el sprinter erosionado pierde punta antes que el rodador táctico', () => {
    const base = eff(80)
    const e = erosion(20, 100, 50) // muy vaciado
    expect(e).toBeGreaterThan(0)
    const now = effNow(base, e)

    // Ambos caen, pero el SPR (coef 0.45) mucho más que el TAC (coef 0.15).
    expect(now.SPR).toBeLessThan(base.SPR)
    const perdidaSpr = (base.SPR - now.SPR) / base.SPR
    const perdidaTac = (base.TAC - now.TAC) / base.TAC
    expect(perdidaSpr).toBeGreaterThan(perdidaTac)
  })

  it('la erosión tiene techo: con el tanque a cero sigue discriminando', () => {
    // docs/motor.md §VI.1: «≤ 0,92 — jamás 1,000». En 1,000 todos los corredores quedan igual de
    // degradados y el resultado vuelve a ser azar. El techo lo garantiza ahora la propia función,
    // no la calibración: medido, una etapa de montaña real en tercera semana vaciaba el 100% del
    // campo y la erosión llegaba a 1,000 (docs/balance.md).
    expect(erosion(0, 100, 50)).toBe(STAGE.erosionMax)
    expect(erosion(0, 100, 90)).toBe(STAGE.erosionMax)
    // Con el techo puesto, dos corredores distintos siguen llegando a meta distintos.
    const fuerte = effNow(eff(80), erosion(0, 100, 50))
    const flojo = effNow(eff(60), erosion(0, 100, 50))
    expect(fuerte.SPR).toBeGreaterThan(flojo.SPR)
  })

  it('la pájara hunde los atributos físicos pero no la táctica', () => {
    const base = eff(80)
    const now = effNow(base, 0, true)
    expect(now.SPR).toBeCloseTo(80 * 0.55)
    expect(now.TAC).toBeCloseTo(80) // la cabeza no se vacía
  })
})

describe('el techo de cerillos (para que la interfaz enseñe la escala)', () => {
  it('es la base más los umbrales, y ningún corredor lo pasa', () => {
    // «Matches 1» no se entiende sin saber que el máximo es 5: la escala tiene que salir del motor
    // y no de un número escrito a mano en la web.
    expect(maxMatchCount()).toBe(STAGE.matchBase + STAGE.matchThresholds.length)
    const tope = {} as Record<Attribute, number>
    for (const a of ATTRIBUTES) tope[a] = 100
    expect(matchCount(tope, 0)).toBeLessThanOrEqual(maxMatchCount())
    // Y el suelo es 1, que es lo que veía el dueño en su perfil.
    const suelo = {} as Record<Attribute, number>
    for (const a of ATTRIBUTES) suelo[a] = 1
    expect(matchCount(suelo, -100, true)).toBe(STAGE.matchMin)
  })
})
