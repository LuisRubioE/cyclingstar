/**
 * Física del corredor y del grupo, bloque a bloque (SPEC 6.4-6.7). Todo puro y determinista.
 * Una sola ley de velocidad sirve al pelotón, a la fuga, al descolgado y a la contrarreloj:
 * cambian los inputs, no la física (SPEC 6.4).
 */
import type { Attribute } from '@cyclingstar/shared'
import { clamp } from '../random.js'
import { STAGE } from '../constants.js'
import type { Block, BlockTerrain, TankState } from './types.js'

/** Efectividades por atributo, ya resueltas por Banister (eff0) o por erosión (effNow). */
export type Eff = Record<Attribute, number>

/** Atributos físicos que la pájara castiga (todos menos la táctica y la recuperación). */
const PHYSICAL: Attribute[] = ['RES', 'LLA', 'MON', 'COL', 'CRI', 'SPR', 'DES', 'PAV']

// --- 6.4 La ley de velocidad ---------------------------------------------------------------

/** Peso del atributo de subida frente al de llano: w(g) = clamp((g - 2) / 6, 0.15, 1.0). */
export function climbWeight(g: number): number {
  return clamp((g - STAGE.wGradientOffset) / STAGE.wGradientScale, STAGE.wMin, STAGE.wMax)
}

/**
 * Valor efectivo del corredor en un bloque (SPEC 6.4). En subida mezcla el atributo de subida
 * (MON, o COL en muros) con el de llano según w(g); en pavés mezcla PAV y LLA.
 */
export function blockPerfil(eff: Eff, block: Block, useCol = false): number {
  switch (block.tipo) {
    case 'subida': {
      const w = climbWeight(block.g)
      const climb = useCol ? eff.COL : eff.MON
      return w * climb + (1 - w) * eff.LLA
    }
    case 'llano':
      return eff.LLA
    case 'paves':
      return STAGE.pavesPavWeight * eff.PAV + STAGE.pavesLlaWeight * eff.LLA
    case 'descenso':
      return eff.DES
  }
}

/**
 * Velocidad de referencia del terreno en km/h (SPEC 6.4).
 *
 * En SUBIDA es hiperbólica, `A / (g + k)`, no lineal: subir es vencer la gravedad, así que la
 * velocidad va como el inverso de la pendiente. La recta anterior (44 − 2.7·g, con suelo en 14)
 * daba VAM de 1.940 m/h al 8% —por encima de cualquier ascensión de la historia— y encima se
 * volvía absurda al pasar del 11%, donde el suelo la dejaba plana y la VAM se disparaba a 2.200.
 * Con la hipérbola la VAM sale sola en el rango real (1.500-1.800 m/h) a cualquier pendiente.
 */
export function vRef(g: number, tipo: BlockTerrain): number {
  switch (tipo) {
    case 'subida':
      return clamp(
        STAGE.vRefClimbNumerator / (g + STAGE.vRefClimbOffset),
        STAGE.vRefClimbMin,
        STAGE.vRefFlat,
      )
    case 'llano':
      return STAGE.vRefFlat
    case 'paves':
      return STAGE.vRefPaves
    case 'descenso':
      return STAGE.vRefDescent
  }
}

/** Ritmo del grupo según su compromiso c (0 tempo, 1 a bloque): 0.90 + 0.35·c. */
export function rhythm(c: number): number {
  return STAGE.rhythmBase + STAGE.rhythmScale * c
}

/**
 * POTENCIA RELATIVA del que marca el ritmo (v19): el atributo, leído como vatios.
 *
 * La escala 0-100 de un atributo **no es una escala de vatios**, y tratarla como tal era el defecto
 * de fondo del abanico de la contrarreloj (docs/balance.md «v19»). `(P75/75)` decía que un corredor
 * de nivel 45 pone el 60 % de los vatios de uno de 75 y que uno de nivel 0 no pone ninguno; un
 * pelotón profesional no es eso. El 0 de la escala no es «parado»: es «no existe», y lo que separa
 * a un continental modesto de un especialista WorldTour es una franja estrecha de la fisiología.
 * Por eso el atributo entra por una recta con suelo (`p75PowerFloor`), normalizada para valer 1
 * exacto en la referencia: la ley no se mueve en el nivel 75 y se comprime hacia abajo.
 */
export function relPower(p75Perfil: number): number {
  const scaled = p75Perfil / STAGE.p75Reference
  return Math.max(0, STAGE.p75PowerFloor + (1 - STAGE.p75PowerFloor) * scaled)
}

/**
 * EL EXPONENTE DE LA LEY, que depende del TERRENO (v19). Contra qué se pedalea decide qué compran
 * los vatios: en llano la resistencia es el aire y crece con v³, así que la velocidad va como la
 * raíz cúbica de la potencia (0,39); subiendo manda la gravedad, que es lineal en la velocidad, y
 * la velocidad va como la potencia entera (1,0). Entre las dos, la rampa es la propia pendiente y
 * satura en `p75ClimbFullGradient`, donde ya no queda aire que valga la pena contar.
 *
 * Pavés y descenso se quedan con el exponente del llano: en los dos manda el aire y no la gravedad.
 * (El pavé tiene además una rodadura enorme, que es lineal como la gravedad y justificaría un
 * exponente intermedio; no se modela, y queda anotado en docs/balance.md «v19».)
 */
export function loadExponent(block: Block): number {
  if (block.tipo !== 'subida') return STAGE.p75Exponent
  const gravity = clamp(block.g / STAGE.p75ClimbFullGradient, 0, 1)
  return STAGE.p75Exponent + (STAGE.p75ExponentClimb - STAGE.p75Exponent) * gravity
}

/**
 * LO QUE VALE RELEVARSE, EN VELOCIDAD (v38, principio 1 del dueño): «el tamaño a medir no es el
 * tamaño del grupo, sino el tamaño de la gente que va tirando… si hay 10 personas tirando, ya sea
 * del pelotón, de una fuga o de lo que sea, tienen potencial para ir más rápido que un grupo donde
 * solo tire 1 (aunque claro, si ese 1 es un crack y no está desfondado… quizás pueda ir más
 * rápido)».
 *
 * Hasta la v37 la ley de velocidad no sabía cuánta gente tiraba: `v = vRef · relPower(P75)^e ·
 * ritmo(c)`, y medido, un grupo de 1, 4, 8, 30 y 150 hombres con el mismo compromiso y el mismo P75
 * iba a la MISMA velocidad exacta (47,31 km/h en llano). El rebufo solo se cobraba en el COSTE, así
 * que el tamaño del turno daba autonomía y no daba velocidad. De ahí salía el defecto que se veía en
 * la carretera: la fuga del día sobrevivía MÁS siendo 2-3 (11,9 %) que siendo 4-6 (2,1 %).
 *
 * Y no hace falta inventar física para arreglarlo, porque el motor ya la tenía escrita en el otro
 * lado del libro. En una rotación de `n`, a cada hombre le toca la cabeza 1/n del tiempo, así que su
 * potencia media es la del que va delante por su exposición, `1 − draftMax·shelterOf(true, n)`. Al
 * revés: **si lo que puede sostener es su umbral, el que va en cabeza puede ir a `umbral /
 * exposición`**, y por eso diez rotando van más rápido que uno solo con las mismas piernas. Es
 * exactamente la misma pieza que `blockCost` cobra en energía, leída en el otro sentido.
 *
 * Se normaliza en `relayPaceReference` porque `vRef` está calibrado contra el pelotón **tal y como
 * el motor lo rueda**: medido sobre cuatro carreras del banco, el turno del pelotón es de 3,20
 * hombres de media (mediana 3, p90 6) —no de ocho: desde la v34 el frente tiene dueño y rotan SUS
 * hombres—. Con esa referencia el pelotón no se mueve ni un dígito y lo que cambia es todo lo demás:
 * el hombre solo pierde, la fuga que se releva entera gana.
 *
 * Y se cobra a precio de rebufo por construcción, sin una línea extra: `draftMax` vale 0,42 en el
 * llano y 0,096 en una rampa al 8 %, así que arriba relevarse casi no compra nada —no hay rueda a la
 * que ir— y el que sube solo sube casi igual que el grupo. Es el mismo argumento de `droppedCommit`
 * (v16), que ahora vive donde tenía que vivir: en la ley.
 */
export function relayPaceEdge(block: Block, pullers: number): number {
  const exposure = (n: number): number => 1 - draftMax(block) * shelterOf(true, n)
  const full = exposure(STAGE.relayPaceReference) / exposure(Math.max(1, pullers))
  return Math.pow(full, STAGE.relayPaceWeight)
}

/**
 * Velocidad objetivo del grupo en un bloque (SPEC 6.4):
 * v_obj = vRef(g)·carga(P75_perfil · relevo)·ritmo(c). El P75 lo aportan quienes marcan el ritmo, la
 * carga es la potencia relativa elevada al exponente del terreno (v19; hasta la v18, `(P75/75)^0.39`
 * en todas partes) y el relevo es lo que valga repartirse el viento entre los que tiran (v38).
 *
 * El relevo entra DENTRO del exponente y no fuera, porque es potencia y no velocidad: en el llano la
 * velocidad va como la raíz cúbica de los vatios (0,39) y subiendo va como los vatios enteros. Así
 * un turno de ocho compra un 4,5 % de velocidad en el llano y un 1,9 % en una rampa dura, que es la
 * carretera.
 */
/**
 * EL COMPROMISO QUE EXPLICA UNA VELOCIDAD (v39). El inverso de `targetSpeed` en su único argumento
 * libre: a qué compromiso habría que rodar para ir a `v` en este bloque, con estas piernas y esta
 * rotación. Es exacto porque el ritmo entra LINEAL en la ley (`rhythm(c) = 0.9 + 0.3c`), así que
 * basta con dos evaluaciones.
 *
 * Existe por un agujero que abrió el régimen de remate (v39): en los últimos kilómetros la
 * velocidad la impone el régimen de sprint y NO el compromiso del grupo, y el coste se seguía
 * calculando con el compromiso. Medido en el banco del tren: el pelotón cruzaba la meta a **59,9
 * km/h con el compromiso en 0,10**, y el trabajo de todos —lanzadores incluidos— valía CERO. Un
 * sprint gratis. Con esto, lo que se cobra es la velocidad que de verdad se lleva, venga de donde
 * venga: el lanzador se funde lanzando, que es lo que hace un lanzador.
 */
export function commitmentForSpeed(
  block: Block,
  p75Perfil: number,
  kmh: number,
  pullers: number = STAGE.relayPaceReference,
): number {
  const v0 = targetSpeed(block, p75Perfil, 0, pullers)
  const v1 = targetSpeed(block, p75Perfil, 1, pullers)
  if (v1 <= v0) return 0
  return (kmh - v0) / (v1 - v0)
}

export function targetSpeed(
  block: Block,
  p75Perfil: number,
  c: number,
  pullers: number = STAGE.relayPaceReference,
): number {
  const base = vRef(block.g, block.tipo)
  const load = Math.pow(relPower(p75Perfil) * relayPaceEdge(block, pullers), loadExponent(block))
  return base * load * rhythm(c)
}

/** Duración en segundos de un bloque de `dx` km a la velocidad actual (Euler explícito, 6.4). */
export function blockSeconds(vActual: number, dx: number = STAGE.dx): number {
  return (3600 * dx) / vActual
}

export interface AccOptions {
  /** Uno de los últimos 20 bloques: se permite la aceleración de trenes y sprint. */
  isFinal?: boolean
  /** Impulso de cerillo activo: la aceleración aplicable se multiplica por 2.5. */
  matchActive?: boolean
  /**
   * VELOCIDAD DEL RÉGIMEN DE REMATE (v39, `finish.ts::sprintRegimeKmh`). Los últimos kilómetros de
   * una llegada masiva no se ruedan, se lanzan, y eso es un esfuerzo anaeróbico que la ley aeróbica
   * de este motor no sabe expresar. Cuando viene, `advanceGroup` toma el máximo entre ella y la ley
   * de siempre. 0 o ausente fuera del remate.
   */
  sprintKmh?: number
}

/** Cota de aceleración aplicable en km/h por segundo (SPEC 6.4), asimétrica y contextual. */
export function accLimit(g: number, opts: AccOptions = {}): number {
  let acc: number = STAGE.accPedal
  if (g <= STAGE.accGravGradient) acc = Math.max(acc, STAGE.accGrav) // la gravedad regala
  if (opts.isFinal) acc = Math.max(acc, STAGE.accFinal)
  if (opts.matchActive) acc *= STAGE.matchAccMultiplier // el W prima financia los cambios bruscos
  return acc
}

/**
 * Persigue la velocidad objetivo con aceleraciones acotadas (SPEC 6.4). Las cotas son en km/h
 * por segundo (jamás por bloque: invariancia de resolución), y frenar es más rápido que acelerar.
 */
export function stepSpeed(
  vActual: number,
  vObjetivo: number,
  g: number,
  dt: number,
  opts: AccOptions = {},
): number {
  const acc = accLimit(g, opts)
  const delta = clamp(vObjetivo - vActual, -STAGE.decMax * dt, acc * dt)
  return vActual + delta
}

// --- 6.5 Coste, tanque y drafting ----------------------------------------------------------

/** Coste base por km según terreno y pendiente (SPEC 6.5). */
export function costBase(block: Block): number {
  if (block.tipo === 'paves') return STAGE.costPavesBase + STAGE.costPavesStars * block.estrellas
  const g = block.g
  if (g <= STAGE.costDescentGradient) return STAGE.costDescentFloor
  if (g < 0) {
    // lerp(0.10, 0.30) entre g = -3 y g = 0.
    const t = (g - STAGE.costDescentGradient) / (0 - STAGE.costDescentGradient)
    return STAGE.costDescentFloor + (STAGE.costFlatBase - STAGE.costDescentFloor) * t
  }
  return STAGE.costFlatBase + STAGE.costClimbSlope * g
}

/** Rebufo máximo disponible según terreno (SPEC 6.5). */
export function draftMax(block: Block): number {
  switch (block.tipo) {
    case 'llano':
      return STAGE.draftFlat
    case 'descenso':
      return STAGE.draftDescent
    case 'paves':
      return STAGE.draftPaves
    case 'subida':
      return clamp(
        STAGE.draftClimbBase - STAGE.draftClimbSlope * block.g,
        STAGE.draftClimbMin,
        STAGE.draftFlat,
      )
  }
}

/**
 * COMPROMISO DEL DESCOLGADO (v16, docs/motor.md §9). A qué ritmo rueda un grupo que ya se ha ido
 * por detrás. Sustituye a la constante `shedCommit` = 0,82, que era la mitad del parche: con ella
 * un descolgado rodaba SIEMPRE al ritmo de un pelotón lanzado y la otra mitad —el recorte fijo de
 * `chaseBackSecondsPerKm`— tenía que existir para tapar los fantasmas que eso producía.
 *
 * Sale de dos cosas que sí son física y que el motor ya modela en el COSTE (SPEC 6.5) sin que
 * llegaran nunca a la velocidad:
 *
 * 1. **Relevarse reparte el viento.** En un grupo de `n` que rota, a cada uno le toca ir en cabeza
 *    1/n del tiempo; el que va solo da la cara el 100 %. Por eso un autobús de cuarenta rueda como
 *    un pelotón y un descolgado suelto no puede sostener ese ritmo aunque tenga las mismas piernas.
 *    Es lo que `shelterAlone` (v15) ya cobraba en energía y aquí se cobra en velocidad.
 * 2. **…y eso vale lo que valga el rebufo en este terreno.** `draftMax` ya lo dice: en el llano un
 *    42 %, en un sector de adoquines un 18 %, y en una rampa al 8 % un 9,6 %. De ahí sale solo el
 *    hecho de carretera que ningún parche sabía imitar: **el grupeto sube tan lento como el que sube
 *    solo** —arriba no hay rueda a la que ir— y en el valle vuelve a rodar como un pelotón.
 * 3. **Con lo que quede en las piernas.** Un grupeto de la última hora de una etapa reina va vacío y
 *    administra; entero, no. `freshness` es E/E₀, la misma frescura que ya pesa en el deber de relevo.
 *
 * Y por encima de las tres, **primero se PERSIGUE y luego uno se resigna**, que es de lo que iba
 * este modelo: el que acaba de soltarse va a su umbral (`shedFightCommit`, el 0,82 de siempre)
 * peleando por volver, y conforme el grupo de cabeza se le pierde de vista pasa a rodar a lo suyo.
 * Sin esta parte el motor mandaba al grupeto a cualquiera que perdiese una rueda, y una etapa reina
 * la ganaba el mejor escalador por siete minutos sobre el décimo; con ella, el que se suelta a un
 * minuto sigue peleando —y esa es la diferencia entre una selección y una debacle—.
 *
 * …Y QUIÉN ES MAYORÍA EN LA CARRETERA (v17, la corrección de la regresión de la v16). El boquete no
 * puede ser lo ÚNICO que decide si un grupo se resigna, porque «resignarse» pasados 300 s es
 * verdad para UN rezagado y es mentira para el pelotón entero. El tamaño ya entraba —`rotation`—,
 * pero satura: con n = 10 vale 0,90 y con n = 126, 0,992, así que un pelotón se rendía igual que un
 * hombre solo. Medido en producción (Race Colombia e5, docs/balance.md «v17»): cuatro corredores
 * delante, 126 detrás, y esos 126 rodando 47 km de terreno rodador a 8 km/h del grupo de cabeza
 * hasta entrar a 74 minutos. Lo que distingue al grupeto que se resigna del pelotón que persigue no
 * es el boquete, es que **cuatro delante y 126 detrás significa que los 126 son la carrera**.
 *
 * Vuelve por eso `chaseBackBusFactor` (v12, retirado por error en la v16): un grupo que TRIPLICA en
 * número al que va delante no se resigna. La rampa es continua entre la paridad —donde no cambia
 * nada— y el triple, y **se cobra a precio de rebufo** (`wind`), que es lo que hace honesto el
 * argumento: ser mayoría paga porque un autobús se releva y caza en el llano; en una rampa al 8 %
 * no hay rueda a la que ir y ser cuarenta no sirve de nada. Por eso el grupeto de la etapa reina
 * —que se resigna EN EL PUERTO— sigue existiendo exactamente igual que en la v16.
 */
export function droppedCommit(
  block: Block,
  size: number,
  freshness: number,
  gapSeconds: number,
  aheadSize: number,
  aheadCommit: number,
): number {
  const wind = draftMax(block) / STAGE.draftFlat
  /**
   * …Y LO QUE VALE RELEVARSE YA NO SE COBRA AQUÍ (v38). Hasta la v37 este término era
   * `shedCommitAlone + (shedCommitBunch − shedCommitAlone)·rotación·viento`: el hombre solo rodaba a
   * 0,55 y el autobús a 0,82, y eso era la v16 metiendo A MANO en el COMPROMISO lo que la ley de
   * velocidad no sabía —que relevarse reparte el viento—. Desde la v38 la ley lo sabe
   * (`relayPaceEdge`), así que dejarlo aquí sería cobrarlo DOS VECES: medido con las dos, el hombre
   * solo perdía un 7 % por el compromiso más un 10,7 % por la ley, y los grupetos se iban fuera de
   * control en el 41,5 % de los abandonos de una gran vuelta (banda 1-15 %).
   *
   * Lo que queda aquí es lo que siempre fue una DECISIÓN y no una física: a qué ritmo QUIERE rodar
   * un grupo que se ha ido por detrás. Y quiere rodar al de un pelotón —lo que pueda darle su turno
   * ya lo dice la ley—.
   */
  const able = STAGE.shedCommitBunch
  const legs =
    STAGE.shedEmptyCommitFactor + (1 - STAGE.shedEmptyCommitFactor) * clamp(freshness, 0, 1)
  // La frescura pesa sobre el ritmo del GRUPETO y no sobre el del que pelea, y no es un detalle: lo
  // que administra es una decisión («me queda poco, lo guardo»), no una limitación —esa ya la cobra
  // la erosión sobre el P75, y cobrarla dos veces mandaba al grupeto a cualquiera que perdiese una
  // rueda—. El que acaba de soltarse va a su umbral aunque vaya vacío; el que ya se ha resignado,
  // no.
  const seen = 1 - clamp(gapSeconds / STAGE.shedResignGapSeconds, 0, 1)
  /**
   * …Y EL QUE VA VACÍO NO PELEA (v40). Pelear era una decisión que solo miraba el boquete y cuánta
   * gente hay a cada lado: el que acababa de soltarse iba a por ellos «aunque fuera vacío», y eso
   * está bien escrito para el que pierde una rueda con medio depósito, pero no para el que está a
   * cero. A cero no se pelea: te sientas y sobrevives, porque no hay con qué.
   *
   * El defecto que lo destapó: las carreras de un día de MONTAÑA —final en alto de doce a quince
   * kilómetros— reventaban el pelotón entero. Medido en Race Jura con campo heterogéneo, **el 82 %
   * del campo cruzaba la meta con el tanque a cero y el vaciado mediano valía 1,000**, o sea que la
   * erosión topaba y el resultado pasaba a ser azar. Y no era el recorrido: Jura es MÁS FÁCIL que Il
   * Lombardia —210 km contra 241, 39 km de subida contra 55, 2.942 m contra 2.995— y Lombardía se
   * queda en 0,949. Lo que las separa es que Jura muere arriba, así que los descolgados se sueltan
   * DENTRO del último puerto, con el boquete todavía pequeño, y se quedaban peleando a tope los
   * catorce kilómetros que les faltaban para la meta.
   */
  const conQuéPelear = clamp(freshness / STAGE.shedFightFreshness, 0, 1)
  const fight = (seen + (1 - seen) * majorityOnTheRoad(size, aheadSize) * wind) * conQuéPelear
  /**
   * …Y PELEAR ES IR MÁS RÁPIDO QUE EL DE DELANTE (v35). El 0,82 de la v16 es un número absoluto —el
   * ritmo de un pelotón lanzado— y contra un pelotón que rueda a tempo (0,55-0,65) eso significaba
   * que el descolgado iba SIEMPRE más rápido que aquel del que se había descolgado. La ventaja de
   * un grupo sobre el que va delante es la que le da RELEVARSE, así que el tope es el ritmo del de
   * delante más lo que valga su rotación, y se mezcla con el 0,82 de siempre a precio de rebufo:
   * en el llano manda el tope, en la rampa no hay rueda a la que ir y queda la v16 intacta.
   */
  const chase = clamp(aheadCommit, 0, 1)
  const ceiling =
    STAGE.shedFightCommit - wind * (STAGE.shedFightCommit - Math.min(STAGE.shedFightCommit, chase))
  // El tope es una LIMITACIÓN, no una decisión, así que se aplica al final y no se mezcla con las
  // piernas: pelear se sigue peleando igual que en la v16 —el que pierde una rueda no se sienta— y
  // lo que la v35 dice es para cuánto le da esa pelea contra un grupo que va a rueda. Por debajo
  // del ritmo que el grupo SOSTIENE no se baja: `able · legs` es el suelo.
  const peleando = able * legs + (STAGE.shedFightCommit - able * legs) * fight
  return Math.max(able * legs, Math.min(peleando, ceiling))
}

/**
 * MAYORÍA EN LA CARRETERA (v17): cuánto pesa ser más que los de delante, de 0 a 1.
 *
 * La escala es `chaseBackBusFactor` (3) leída en los dos sentidos, y esa simetría es justo lo que se
 * quiere decir: **eres un grupeto cuando ellos te triplican a ti** (razón ≤ 1/3, vale 0, y es
 * exactamente lo que había en la v16) **y eres un pelotón cuando tú los triplicas a ellos** (razón
 * ≥ 3, vale 1, no te resignas). Entre medias la rampa es continua, así que dos mitades de un
 * pelotón partido —el caso que de verdad se ve en carretera— quedan cerca del centro y siguen
 * peleando un poco, sin que ninguna se convierta de golpe en la otra cosa.
 *
 * Los dos casos que la fijan: el grupeto de una gran vuelta (cuarenta detrás de ciento veinte, razón
 * 0,33) no se entera de que esto existe; los 126 de Race Colombia e5 detrás de 4 dan 1 y no se
 * resignan, que es de lo que iba la corrección.
 */
export function majorityOnTheRoad(size: number, aheadSize: number): number {
  const ratio = size / Math.max(1, aheadSize)
  const floor = 1 / STAGE.chaseBackBusFactor
  return clamp((ratio - floor) / (STAGE.chaseBackBusFactor - floor), 0, 1)
}

/**
 * EL ESFUERZO DE UN CORREDOR, que no es la velocidad de su grupo (v26).
 *
 * El motor medía el TRABAJO AL FRENTE con `max(0, compromiso − frontWorkIdleCommit)`, y eso es un
 * número de VELOCIDAD. Con él, una fuga de seis que rueda a `compromiso` 0,44 —dos minutos por
 * delante de un pelotón de ciento cincuenta durante 150 km— anotaba **cero trabajo en todo el día**,
 * y de ahí colgaban tres cosas: `break_share` («quién tira en la fuga y quién va de pasajero») se
 * repartía sobre ceros, la reserva de un fugado se recargaba como la de uno que va a rueda, y su TSS
 * salía subestimado.
 *
 * Lo que determina cuánto trabaja un hombre no es a qué velocidad va su grupo: es **cuánto viento le
 * toca dar**. Y eso el motor ya lo sabía y ya lo había escrito, en `droppedCommit` (v16):
 * «relevarse reparte el viento… el que va solo da la cara el 100 %». Allí se cobró en VELOCIDAD;
 * esto es exactamente el mismo argumento cobrado en TRABAJO, con la misma pieza —el rebufo que de
 * verdad recibe cada uno, `1 − draftMax·shelter`—.
 *
 * La referencia es lo que gasta un corredor ARROPADO en un grupo que rueda al tempo de carretera:
 * por debajo de eso se está descansando y por encima se está trabajando. Para el pelotón el número
 * sale casi idéntico al de antes —un relevo a 0,85 daba 0,35 y ahora da 0,40—, así que la voz de la
 * crónica no se mueve; para una fuga de seis pasa de 0 a positivo, que es el defecto.
 */
export function riderEffort(block: Block, commit: number, shelter: number): number {
  return commit * (1 - draftMax(block) * shelter)
}

/**
 * O TIRAS O NO TIRAS, Y TIRAR CUESTA LO QUE CUESTE REPARTIRLO (v34, SPEC 6.5).
 *
 * Hasta la v33 había CUATRO estados de rebufo —a rueda 0,9 | rotando en cabeza 0,4 | relevando 0,5
 * | solo 0,0— y eran cuatro nombres para un continuo. Medido sobre seis carreras del banco
 * (`scripts/medir-rebufo.mjs`): el 41,5 % de los bloques-corredor caían en el estado intermedio, y
 * en el pelotón eso son **36,5 nombres de 14,9 equipos distintos** «en el turno» contra 3 de un solo
 * equipo «al frente». No es un reparto de trabajo: es media parrilla pagando viento a la vez.
 *
 * Y la cifra que lo cierra: la FACTURA del pelotón —cuántos hombres de viento paga el grupo entero,
 * `Σ (shelterProtected − shelter_i) / shelterProtected`— salía **17,91 de media y 57,6 en el peor
 * caso**. En la carretera esa cifra es 1: en cada instante hay UN hombre dando la cara y todos los
 * demás van a rueda. El motor se estaba inventando dieciocho.
 *
 * La regla nueva es la de la carretera y cabe en una línea: **en una rotación de n, a cada uno le
 * toca la cabeza 1/n del tiempo**, así que su rebufo medio es `shelterProtected · (1 − 1/n)`. De
 * ahí salen solas las tres cosas que el dueño pidió que fueran una sola:
 *
 *  - **solo** es n = 1 y da exactamente `shelterAlone` = 0: el que no tiene quien le releve paga el
 *    viento entero. No hace falta preguntar por él.
 *  - **tira** es cualquier n > 1, y duele MENOS cuanto más grande sea el turno, que es de lo que se
 *    trata: uno de veinte pasando turnos no se desgasta como uno solo.
 *  - **no tira** es `shelterProtected`, y ahí va el jefe de filas al que llevan los suyos: protegido
 *    y punto, ni un vatio más que el último del pelotón.
 *
 * Y la factura del grupo vale 1 sea cual sea n, porque `n · (1/n) = 1`. Es la misma identidad que
 * hace honesto el argumento: cambiar el tamaño de la rotación cambia ENTRE QUIÉNES se reparte el
 * viento, nunca cuánto viento hay.
 *
 * Es el mismo 1 − 1/n que `droppedCommit` (v16) cobraba en VELOCIDAD —«relevarse reparte el viento;
 * el que va solo da la cara el 100 %»— y que hasta hoy solo usaban los grupos descolgados.
 *
 * `arropo` es CUÁNTO REBUFO HAY (v41): normalmente `shelterProtected`, y menos cuando la carretera
 * no da para tanto (`gutterShelter`, el abanico). Entra en los dos estados y no solo en el del que
 * va a rueda, porque en una fila que no cabe el que sale del relevo tampoco encuentra dónde
 * meterse.
 */
export function shelterOf(
  pulling: boolean,
  pullers: number,
  arropo: number = STAGE.shelterProtected,
): number {
  if (!pulling) return arropo
  const n = Math.max(1, pullers)
  return STAGE.shelterAlone + (arropo - STAGE.shelterAlone) * (1 - 1 / n)
}

/**
 * CUÁNTO REBUFO HAY DE VERDAD PARA UN GRUPO DE ESTE TAMAÑO (v41). Es `shelterProtected` —ir a
 * rueda— salvo con el viento de lado, donde el rebufo va en DIAGONAL y la fila se come el ancho del
 * asfalto: a partir de cierto número no se cabe, y el que no cabe no va a rueda de nadie, va en la
 * cuneta pagando el viento entero.
 *
 * Es la pieza que le faltaba al abanico, y sin ella el corte era un adorno: medido, el pelotón se
 * partía dejando 21 hombres delante y 152 detrás, y ganaban los 152 —porque los 140 que no rotaban
 * en ese grupo iban A RUEDA, recargando, mientras los 21 de delante se fundían rotando—. Ser muchos
 * salía gratis justo el día en que ser muchos es el problema.
 *
 * Se degrada en proporción, `caben / son`, con un SUELO (`windGutterFloor`). Con el suelo puesto lo
 * que la cuenta dice en la práctica es lo que dice la carretera —o vas en la fila o vas en la
 * cuneta—: hay una rampa corta mientras el grupo sobra por poco y, a partir de ahí, sobrar por poco
 * y sobrar por mucho se pagan igual, porque el segundo de la fila está en la cuneta lo mismo que el
 * centésimo. Cuando el grupo cabe, no cambia nada.
 *
 * …Y CON SUELO (`windGutterFloor`), porque sin él esto no era un abanico sino una matanza: medido en
 * el Tour de Flandes con viento fuerte, **el 85 % del campo con el depósito a cero**. La proporción
 * pura dice que en un grupo de 150 con capacidad para 13 se va a rueda al 8 %, y eso es falso: en
 * carretera, el que se queda fuera del corte no pasa cien kilómetros solo en la cuneta —se junta con
 * los de al lado, hacen su propia fila y ruedan—. El suelo es esa fila de segunda: peor que ir en el
 * abanico bueno, no la muerte.
 */
export function gutterShelter(size: number, caben: number): number {
  return (
    STAGE.shelterProtected * Math.max(STAGE.windGutterFloor, Math.min(1, caben / Math.max(1, size)))
  )
}

/**
 * CUÁNTOS TIRAN de este grupo. El ritmo pide una fracción del grupo (`paceFraction`: el cuarto
 * delantero del pelotón, el 12 % en un puerto, la cooperación de una fuga) y la carretera pone el
 * techo: en la cabeza de un grupo caben unos pocos hombres rotando, no un cuarto del pelotón
 * (`relayRotationMax`). El turno es el menor de los dos, y nunca menos de uno: si el grupo rueda,
 * alguien está dando la cara.
 *
 * …Y ESTO YA NO DECIDE QUIÉN TIRA (v38). Lo decide `relayTurn` con un UMBRAL sobre el deber de
 * relevo, así que esta función se queda con lo único que siempre fue suyo: cuántos hombres CABEN
 * dando la cara, que es lo que pide el ritmo del terreno con el tope de la carretera
 * (`relayRotationMax` = 20). Se usa donde hace falta una cuenta de capacidad y no un turno concreto:
 * la deriva de la subida, que compara lo que puede un hombre contra lo que puede su grupo.
 */
export function relayRotation(size: number, paceFraction: number): number {
  const asked = Math.ceil(paceFraction * size)
  return Math.max(1, Math.min(size, asked, STAGE.relayRotationMax))
}

/** El esfuerzo de referencia: ir arropado en un grupo que rueda al tempo de carretera. */
export function idleEffort(block: Block): number {
  return riderEffort(block, STAGE.frontWorkIdleCommit, STAGE.shelterProtected)
}

/**
 * LO QUE CUESTA EL VIENTO QUE TE TOCA (v38, principio 2 del dueño): «el que va a rueda va muuucho
 * más cómodo y por tanto muchísimo menor coste».
 *
 * Hasta la v37 el coste era LINEAL en la exposición: `1 − draftMax·shelter`, o sea 1,00 dando la
 * cara y 0,62 a rueda. Eso dice que ir a rueda cuesta el 62 % de dar la cara, y en la carretera no
 * es eso. La potencia sí va en esa proporción —el rebufo ahorra un 40 % de vatios, no un 90 %—,
 * pero lo que este motor gasta no son vatios: es el DEPÓSITO, y el depósito no es lineal en la
 * potencia. A 45 km/h el que da la cara va por encima de su umbral quemando glucógeno y el que va a
 * rueda va en fondo, donde casi no se gasta. Por eso la exposición entra por un exponente.
 *
 * Y LA REFERENCIA DE CADA HOMBRE ES LO QUE SOSTENDRÍA ÉL SOLO, no un absoluto. Ésta es la
 * corrección que hace que el modelo no se rompa por los extremos: la convexidad describe lo que
 * cuesta ir POR ENCIMA de tu propio umbral, que es lo que le pasa al que da la cara en un grupo que
 * rueda más rápido de lo que él aguantaría solo. Cuánto más rápido va ese grupo ya lo dice la ley de
 * velocidad (`relayPaceEdge`), leída contra `n = 1`. De ahí sale sola la propiedad que hace falta:
 *
 *  - **el que va SOLO no paga convexidad ninguna** —su excursión vale 1— porque va a su umbral por
 *    definición. Es el mismo argumento que ancla la contrarreloj, y ahora no hace falta escribirlo
 *    como excepción: sale de la fórmula.
 *  - **el que rota en un pelotón sí la paga**, porque el pelotón va más rápido de lo que él
 *    sostendría solo, y por eso da la cara por turnos y no todo el rato.
 *
 * Sin esto, el descolgado solo pagaba el coste de «ir en cabeza del pelotón» aunque fuera diez
 * km/h más despacio, y con el exponente alto eso lo mandaba fuera de control: medido, el 24,7 % de
 * los abandonos de una gran vuelta contra una banda de 1-15 %.
 */
export function timeTrialCost(block: Block, c: number, dx: number = STAGE.dx): number {
  return dx * costBase(block) * Math.pow(rhythm(c), STAGE.costRhythmExponent)
}

/**
 * EL EXPONENTE DEL RITMO ES EL INVERSO DE LA LEY (v39). El dueño: «ir en cabeza no es solo un tema
 * del viento, es un tema de desgaste porque vas marcando la velocidad; obviamente es muy diferente
 * ir en cabeza a 70 km/h que a 30 km/h, suponiendo llano en ambos casos».
 *
 * Tiene razón y el motor se contradecía a sí mismo. La ley de velocidad dice que en LLANO la
 * velocidad responde a la potencia con exponente `p75Exponent` = 0,39 —o sea que para ir un 10 %
 * más rápido hay que poner un 27 % más de vatios, `P ∝ v^2,56`, que es la ley aerodinámica— y en
 * CUESTA responde con exponente 1,0, porque ahí lo que se paga es levantar el peso y la velocidad
 * es proporcional a la potencia. Pero el COSTE del ritmo usaba un exponente FIJO de 1,6 para las
 * dos cosas: infracobraba el llano rápido —justo el caso del dueño— y sobrecobraba la cuesta.
 *
 * El exponente correcto es exactamente el inverso del de la ley que convierte potencia en
 * velocidad: `1 / loadExponent(block)`. No es una calibración, es cerrar el círculo — con esto,
 * subir el ritmo cuesta lo que la propia ley del motor dice que cuesta.
 *
 * `costRhythmLawShare` mezcla con el exponente viejo para poder medir el cambio por partes; en 1
 * manda la ley.
 */
export function rhythmCostExponent(block: Block): number {
  const porLey = 1 / Math.max(1e-9, loadExponent(block))
  return STAGE.costRhythmExponent + (porLey - STAGE.costRhythmExponent) * STAGE.costRhythmLawShare
}

export function blockCost(
  block: Block,
  c: number,
  pulling: boolean,
  pullers: number,
  dx: number = STAGE.dx,
  arropo: number = STAGE.shelterProtected,
): number {
  const d = draftMax(block)
  const n = Math.max(1, pullers)
  /**
   * LO QUE CUESTA CADA ESTADO, con el NIVEL fuera del exponente. `costExposureLevel` no entra en la
   * proporción: multiplica a los dos por igual, así que la proporción es solo del exponente y el
   * nivel es solo suyo. Separarlos es lo que hace esto calibrable.
   */
  const cara = STAGE.costExposureLevel
  /**
   * …Y HAY UN SUELO: PEDALEAR CUESTA AUNQUE VAYAS A RUEDA (v38, `costExposureFloor`).
   *
   * El exponente describe el coste MARGINAL de dar la cara, y ahí el número del dueño —la rueda al
   * 10 % de la cara en llano— es bueno. Pero no todo el gasto es marginal: cubrir 280 km es cubrir
   * 280 km, y eso lo paga el que va a rueda igual que el que tira. Sin este suelo, un pelotón de
   * verdad —donde el corredor mediano solo pasa el 3,5 % de la etapa dando la cara, contra el 19,6 %
   * de un campo de cuarenta— salía de una llana con el 12 % del depósito gastado en vez del 33 %, y
   * una clásica de 278 km dejaba de cansar a nadie: la erosión se hundía a 0,282 contra un suelo de
   * 0,45.
   *
   * El defecto solo se vio al meter EQUIPOS y un PELOTÓN DE VERDAD en los escenarios canónicos, que
   * es lo que pidió el dueño. Con cuarenta corredores todo el mundo tiraba a menudo y el suelo no
   * hacía falta para llegar a las cifras: el banco tapaba el agujero.
   */
  // `arropo` es el rebufo que la carretera da de verdad (v41): `shelterProtected` salvo en un
  // abanico, donde el que no cabe en la fila no va a rueda de nadie (`gutterShelter`).
  const abrigo = Math.pow(1 - d * arropo, STAGE.costExposureExponent)
  const rueda =
    STAGE.costExposureLevel * (STAGE.costExposureFloor + (1 - STAGE.costExposureFloor) * abrigo)
  /**
   * Y LA EXPOSICIÓN SE PROMEDIA SOBRE EL TURNO, NO SOBRE EL REBUFO (v38). Hasta la v37 se calculaba
   * el rebufo MEDIO del que tira (`shelterOf`: `shelterProtected·(1 − 1/n)`) y se cobraba una vez.
   * Es la cuenta del dueño, pero hecha en el orden que engaña: lo que un hombre hace de verdad en
   * una rotación de dos no es ir a medio rebufo todo el rato, es ir **la mitad del tiempo dando la
   * cara y la mitad a rueda**, y como el coste no es lineal, promediar antes o después NO da lo
   * mismo. Textual: «si solo tira 1, el coste debería ser prácticamente el doble que si tiran 2…
   * porque si tiran 2, pues el 50 % está tirando y el 50 % está a rueda».
   */
  const share = pulling ? 1 / n : 0
  /**
   * …Y SE PAGA A LA VELOCIDAD A LA QUE DE VERDAD VA EL GRUPO (v38). El compromiso dice a qué ritmo
   * QUIERE ir el grupo, pero desde que la ley de velocidad sabe entre cuántos se reparte el viento,
   * un grupo pequeño con el mismo compromiso va MÁS DESPACIO. Sin esta línea el descolgado solo
   * pagaba el coste de ir a la velocidad del pelotón yendo diez km/h más lento, y con el exponente
   * alto eso lo mandaba fuera de control.
   */
  const marcha = rhythm(c) * relayPaceEdge(block, n)
  /**
   * …Y EL EXPONENTE NUEVO CAMBIA LA FORMA, NO EL NIVEL (v39). Pasar el exponente de 1,6 a la ley
   * (2,56 en llano) encarece TODO el llano de golpe: medido, un +19 % al ritmo de carrera, que
   * mandaba Strade Bianche de 0,918 de vaciado a 0,992 con un 38 % de pájaras. Y eso no es lo que
   * dice la física del dueño: lo que dice es que ir a 70 cuesta MUCHO más que ir a 30, no que ir a
   * 30 cueste más de lo que costaba.
   *
   * Así que el ritmo entra ANCLADO en un pivote —el ritmo al que se rueda un día normal— y elevado
   * allí al exponente viejo. En el pivote el coste es exactamente el de siempre; por encima sube
   * más deprisa que antes y por debajo baja más deprisa. La calibración de todo el juego se queda
   * donde estaba y lo que cambia es la CURVATURA, que es justo lo que había que arreglar.
   */
  const pivote = STAGE.costRhythmPivot
  return (
    dx *
    costBase(block) *
    Math.pow(pivote, STAGE.costRhythmExponent) *
    Math.pow(marcha / pivote, rhythmCostExponent(block)) *
    (share * cara + (1 - share) * rueda)
  )
}

// --- 6.6 Cerillos ---------------------------------------------------------------------------

/**
 * Cerillos disponibles (SPEC 6.6). comp = 0.50·max(MON,COL) + 0.30·RES + 0.20·LLA;
 * cerillos = 2 + umbrales; con TSB < -25 se resta uno; el vaciado profundo del día anterior
 * resta otro. Mínimo 1.
 */
/**
 * EL TECHO DE CERILLOS, para que la interfaz pueda enseñar la ESCALA sin inventársela. Un número de
 * cerillos a pelo no dice nada —el dueño, mirando su perfil: «pone matches 1… eso no aporta, ni se
 * entiende»— porque «1» solo significa algo si sabes que el máximo es 5. Los dos descuentos (ir muy
 * cargado y venir vaciado) solo RESTAN, así que el techo es la base más los umbrales.
 */
export function maxMatchCount(): number {
  return STAGE.matchBase + STAGE.matchThresholds.length
}

export function matchCount(eff0: Eff, tsb: number, deepDepleted = false): number {
  const comp =
    STAGE.matchCompMonWeight * Math.max(eff0.MON, eff0.COL) +
    STAGE.matchCompResWeight * eff0.RES +
    STAGE.matchCompLlaWeight * eff0.LLA
  let matches = STAGE.matchBase
  for (const threshold of STAGE.matchThresholds) if (comp >= threshold) matches += 1
  if (tsb < STAGE.matchTsbPenaltyThreshold) matches -= 1
  if (deepDepleted) matches -= 1
  return Math.max(STAGE.matchMin, matches)
}

// --- 6.7 Erosión por vaciado ---------------------------------------------------------------

/** Fracción de vaciado del tanque: clamp(1 - E/E0, 0, 1). */
export function depletion(energy: number, energy0: number): number {
  return clamp(1 - energy / energy0, 0, 1)
}

/**
 * ¿Terminó la etapa con VACIADO PROFUNDO (SPEC 6.6)? Quien acaba por debajo del
 * `matchDepletionThreshold` de su depósito arranca la etapa siguiente con un cerillo menos
 * (`matchCount(eff0, tsb, deepDepleted)`), que hasta ahora nunca se activaba.
 */
export function isDeepDepleted(energy: number, energy0: number): boolean {
  if (energy0 <= 0) return false
  return energy / energy0 < STAGE.matchDepletionThreshold
}

/** Foto del tanque de un corredor en meta (SPEC 6.6, 6.7), para telemetría e invariantes. */
export function tankState(energy: number, energy0: number, res: number): TankState {
  return {
    energy0,
    energy,
    depletion: depletion(energy, energy0),
    erosion: erosion(energy, energy0, res),
    deepDepleted: isDeepDepleted(energy, energy0),
  }
}

/**
 * Erosión del corredor (SPEC 6.7). Nada por debajo del umbral (0.35 + 0.40·RES/100); a partir
 * de ahí crece con el vaciado, TOPADA en `erosionMax`.
 *
 * El techo no es cosmético y estaba escrito en docs/motor.md §VI.1 sin implementar: «con la erosión
 * topada en 1,000 el pelotón entero está al máximo de degradación, el modelo DEJA DE DISCRIMINAR y
 * el resultado vuelve a ser azar». Hasta ahora ese techo solo lo garantizaba la calibración de las
 * clásicas de un día con el campo fresco; medido sobre etapas de montaña REALES con un campo de
 * tercera semana, la erosión llegaba a 1,000 en el 100% del pelotón (docs/balance.md).
 */
export function erosion(energy: number, energy0: number, res: number): number {
  const depl = depletion(energy, energy0)
  const umbral = STAGE.erosionThresholdBase + STAGE.erosionThresholdResScale * (res / 100)
  return Math.min(STAGE.erosionMax, Math.max(0, (depl - umbral) / (1 - umbral)))
}

/**
 * Efectividad ahora mismo de un atributo bajo erosión (SPEC 6.7):
 * effNow(a) = eff0(a)·(1 - coefErosion[a]·erosion^1.2). El sprinter (coef 0.45) pierde punta
 * mucho antes que el rodador táctico (coef 0.15).
 */
export function effNowAttr(eff0Value: number, attr: Attribute, erosionValue: number): number {
  // RES y REC no erosionan (no aparecen en la tabla del SPEC 6.7): coef 0.
  const coef = (STAGE.erosionCoef as Partial<Record<Attribute, number>>)[attr] ?? 0
  return eff0Value * (1 - coef * Math.pow(erosionValue, STAGE.erosionExponent))
}

/**
 * LA PÁJARA NO ES UN ACANTILADO (v38). Hasta la v37 la pájara era un booleano sobre `energy <= 0`:
 * con el depósito en 0,001 no pasaba nada y con el depósito en 0 los atributos físicos caían de
 * golpe un 45 %. Eso hace que el motor sea EXTREMADAMENTE sensible al nivel del coste justo en el
 * borde: medido al recalibrar la v38, la clásica más dura pasaba del 8 % del campo con pájara al
 * 46 % y al 100 % con empujones pequeños del nivel, sin que ninguna banda lo cazara.
 *
 * El dueño: «las pájaras igual hay que recalibrar cuándo se produce una pájara». Y en la carretera
 * tampoco es un interruptor: el glucógeno no se acaba de golpe, se va acabando, y el hombre se va
 * apagando en los últimos kilómetros antes de reventar del todo. Así que el castigo entra por una
 * RAMPA sobre el último `bonkOnset` del depósito: al 8 % de reserva no pasa nada, a cero se paga
 * entero, y entre medias se paga la parte proporcional.
 *
 * `bonkFactor` no se mueve —la pájara con el depósito a cero cuesta lo que costaba— y el booleano
 * de la crónica sigue siendo `energy <= 0`, así que lo que se narra sigue siendo la pájara de
 * verdad y no el aviso.
 */
export function bonkPenalty(energy: number, energy0: number): number {
  if (energy <= 0) return STAGE.bonkFactor
  const onset = STAGE.bonkOnset * Math.max(1e-9, energy0)
  if (energy >= onset) return 1
  const t = energy / onset
  return STAGE.bonkFactor + (1 - STAGE.bonkFactor) * t
}

/**
 * Efectividades actuales de todos los atributos (SPEC 6.7). `bonk` es cuánto se paga por tener el
 * depósito en las últimas: 1 mientras quede reserva y `bonkFactor` con el tanque a cero, con la
 * rampa de `bonkPenalty` entre medias. Se admite un booleano por compatibilidad con los bancos.
 */
export function effNow(eff0: Eff, erosionValue: number, bonk: boolean | number = false): Eff {
  const penalty = typeof bonk === 'number' ? bonk : bonk ? STAGE.bonkFactor : 1
  const out = {} as Eff
  for (const attr of Object.keys(eff0) as Attribute[]) {
    let value = effNowAttr(eff0[attr], attr, erosionValue)
    if (penalty < 1 && PHYSICAL.includes(attr)) value *= penalty
    out[attr] = value
  }
  return out
}
