/**
 * Escenarios canónicos para el balance del motor (SPEC 6.17). Campos de corredores realistas y
 * reproducibles; la varianza entre corridas entra por la semilla de la etapa (composición de la
 * fuga, cooperación, ruido del sprint), no por los atributos.
 */
import type { Attribute } from '@cyclingstar/shared'
import { initialEnergy } from '../banister.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { stageSeed } from '../stage/rng.js'
import type { StageInput, StageOrders, StageRider } from '../stage/types.js'

/**
 * Estado del pelotón en la TERCERA SEMANA de una gran vuelta, para el escenario fatigado. No son
 * constantes de juego sino el punto de medida del objetivo de erosión de docs/motor.md §VI.1: un
 * corredor con mucho fondo acumulado (CTL alto por 14 días de carrera) y hundido de frescura.
 */
const THIRD_WEEK_CTL = 100
const THIRD_WEEK_TSB = -55

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

function orders(o: Partial<StageOrders>): StageOrders {
  return { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false, ...o }
}

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

export interface Scenario {
  name: string
  input: StageInput
  /** El mejor sprinter del campo (para el invariante "mejor sprinter 30-45%"). */
  bestSprinterId: string
}

/**
 * REPARTE EL CAMPO EN EQUIPOS (v38). Hasta ahora los escenarios canónicos corrían SIN equipos, y el
 * dueño lo cazó: «sin equipo no hay motivo para que el pelotón tire para acabar con una fuga, y las
 * fugas deberían llegar mucho más de lo que llegan… o en otros términos, al introducir equipos
 * reduces las probabilidades de que las fugas lleguen drásticamente, y por tanto esas simulaciones
 * no valen para nada».
 *
 * Tiene razón y es serio: la caza de una llana la organizan los TRENES (`chaseField`), el frente lo
 * lleva un DUEÑO (v34) y el presupuesto que se agota es de EQUIPO (v15). Con el campo suelto nada de
 * eso existe, así que las bandas de supervivencia de la fuga estaban medidas contra un pelotón que
 * no es el que corre el juego.
 *
 * El reparto es el de una carrera: cada corredor con un rol propio —sprinter, cazaetapas, líder— es
 * el JEFE de un equipo, y los de relleno se reparten entre ellos como gregarios (lanzadores si su
 * jefe es sprinter, que es lo que `chaseField` cuenta como tren). Los atributos no se tocan: lo
 * único que cambia es de quién es cada uno.
 */
function inTeams(riders: StageRider[], teamSize: number): StageRider[] {
  const equipos = Math.max(1, Math.ceil(riders.length / teamSize))
  const propios = riders.filter((r) => r.orders.role !== 'libre')
  const relleno = riders.filter((r) => r.orders.role === 'libre')
  const teamOf = new Map<string, string>()
  const jefeDe = new Map<string, string>()
  // Los hombres con carrera propia se reparten UNO POR EQUIPO: en una carrera no van los tres
  // sprinters en el mismo autobús.
  propios.forEach((r, i) => {
    const t = `eq-${i % equipos}`
    teamOf.set(r.riderId, t)
    if (!jefeDe.has(t)) jefeDe.set(t, r.riderId)
  })
  // …y el resto rellena. Al equipo que no tenga un hombre con carrera propia se le nombra jefe de
  // filas al primero que le toque: todo equipo lleva un protegido, aunque no sea nadie para ganar.
  const promovidos = new Set<string>()
  relleno.forEach((r, i) => {
    const t = `eq-${i % equipos}`
    teamOf.set(r.riderId, t)
    if (!jefeDe.has(t)) {
      jefeDe.set(t, r.riderId)
      promovidos.add(r.riderId)
    }
  })
  return riders.map((r) => {
    const team = teamOf.get(r.riderId)!
    if (r.orders.role !== 'libre') return { ...r, teamId: team }
    if (promovidos.has(r.riderId)) {
      return { ...r, teamId: team, orders: orders({ ...r.orders, role: 'lider' }) }
    }
    const jefe = jefeDe.get(team)
    if (jefe == null) return { ...r, teamId: team }
    const suJefe = riders.find((x) => x.riderId === jefe)
    /**
     * UN TREN SON DOS HOMBRES, NO SIETE (v38). Esto ponía de `lanzador` a TODO el relleno de un
     * equipo de sprinter, y el deber de relevo de un lanzador (0,85) es menor que el de un gregario
     * (1,0) porque se guarda para el último kilómetro. O sea que los únicos equipos con motivo para
     * llevar el pelotón eran justo los que menos obligación tenían de dar la cara al viento.
     */
    const enSuEquipo = relleno.filter((x) => teamOf.get(x.riderId) === team)
    const puesto = enSuEquipo.findIndex((x) => x.riderId === r.riderId)
    const esTren = suJefe?.orders.role === 'sprinter' && puesto < 2
    return {
      ...r,
      teamId: team,
      orders: orders({
        ...r.orders,
        role: esTren ? 'lanzador' : 'gregario',
        targetRiderId: jefe,
      }),
    }
  })
}

/**
 * LOS DIEZ VELOCISTAS DE UNA CARRERA DE VERDAD, en degradado y con un jefe claro (v38).
 *
 * Antes eran TRES, y los otros diecinueve equipos del pelotón llevaban de jefe a un relleno clonado.
 * Medido sobre la llana canónica: **3 equipos de 22 tenían carta de etapa** —o sea, motivo para
 * gastar un vatio— y esos tres se fundían el presupuesto colectivo hacia el km 100. A partir de ahí
 * el pelotón rodaba con CUATRO hombres de 172 dando la cara y cualquier corte de diez se iba: un
 * grupo de 11 a 30 hombres llegaba por delante del pelotón en el 23 % de las llanas.
 *
 * Una llana la disputan ocho o diez equipos con velocista y por eso hay siempre alguien fresco al
 * frente: cuando se funde el que lleva, entra el siguiente. Y el primero va un escalón por encima
 * de los demás, que es lo que hace que el favorito del día sea el favorito y no uno más: con los
 * diez a dos puntos unos de otros el mejor ganaba el 28 % de los sprints, por debajo de lo que gana
 * un velocista dominante de verdad.
 */
function sprintersEnDegradado(
  base: number,
  over: Partial<Record<Attribute, number>>,
): StageRider[] {
  const spr = [88, 82, 80.5, 79, 77.5, 76, 74.5, 73, 71.5, 70]
  return spr.map((s, i) =>
    rider(`spr-${i}`, {
      eff0: eff(base, { SPR: s, LLA: i === 0 ? 70 : 68 - 0.7 * (i - 1), ...over }),
      orders: orders({ role: 'sprinter', contestSprints: true }),
    }),
  )
}

/**
 * Etapa llana de 180 km con una meta volante: velocistas de todos los niveles, un puñado de cazaetapas y un
 * pelotón de rodadores (SPEC 6.17). El campo es fijo; la semilla mueve el resto.
 */
export function flatScenario(): Scenario {
  const riders: StageRider[] = []
  /**
   * DIEZ SPRINTERS EN DEGRADADO, NO TRES Y UN DESIERTO (v38). Con tres, medido: **3 equipos de 22
   * tenían carta de etapa** y los otros diecinueve llevaban de jefe a un relleno clonado —58,3 de
   * remate contra 77,8 del mejor—, o sea ningún motivo para gastar un vatio. Esos tres se fundían
   * el presupuesto hacia el km 100 y a partir de ahí el pelotón rodaba con CUATRO hombres de 172
   * dando la cara, con lo que cualquier corte de diez se iba: un grupo de 11 a 30 hombres llegaba
   * por delante del pelotón en el 23 % de las llanas.
   *
   * Una llana de verdad la disputan ocho o diez equipos con velocista, de mundial a discreto, y por
   * eso hay siempre alguien fresco al frente: cuando se funde el que lleva, entra el siguiente. El
   * degradado es lo que reparte las 180 km de trabajo, y sin él no hay pelotón que cace nada.
   */
  riders.push(...sprintersEnDegradado(55, {}))
  for (let i = 0; i < 6; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(55, { TAC: 60, LLA: 68 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  /**
   * UN PELOTÓN DE VERDAD (v38). El dueño, al ver que con 40 corredores en 8 equipos la fuga ganaba
   * el 58,5 % de las llanas: «no te creo… en lo que veo del motor en las llanas la fuga NUNCA gana;
   * quizás tienes que poner más ciclistas en la simulación para que salga algo real… sí, pon un
   * pelotón de verdad en el escenario canónico».
   *
   * Y es que 40 hombres en 8 equipos de 5 no son un pelotón: son una continental. Solo tres equipos
   * tienen sprinter, sus trenes son de cinco, el presupuesto de esfuerzo se agota enseguida y los
   * equipos que llegan a llevar el frente se quedan en 1,8 — con lo que la fuga llega, que es lo que
   * pasa en una carrera pequeña de verdad—. El juego corre 176 corredores en 22 equipos de 8, y ése
   * es el pelotón contra el que tienen que estar calibradas las bandas de la llana canónica.
   *
   * Lo que NO cambia es el carácter del escenario: sigue siendo una llana con velocistas de nivel y
   * un puñado de cazaetapas; lo que crece es el pelotón que llevan detrás.
   */
  for (let i = 0; i < 160; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(56, { LLA: 62 + (i % 8) }) }))
  }
  return {
    name: 'llana-180',
    input: {
      profile: {
        segments: [{ km: 180, tipo: 'llano' }],
        banners: [{ km: 100, tipo: 'meta_volante' }],
      },
      // CON EQUIPOS desde la v38: sin ellos no hay trenes que cacen, ni dueño del frente, ni
      // presupuesto que se agote, y la fuga del día vivía en un mundo que no es el que corre el
      // juego. Ver `inTeams`.
      riders: inTeams(riders, 8),
    },
    bestSprinterId: 'spr-0',
  }
}

/**
 * MEDIA MONTAÑA (v38): 190 km con SIETE cotas que no son puertos —3 a 5 km al 5-7 %— y llegada en
 * un repecho. Es el hueco que el dueño señaló en el banco: «estaría bien poner también algunas de
 * media montaña… o sea, muchas montañitas no tan duras, pero que disminuyan las probabilidades de
 * que los sprinters lleguen o que lleguen con fuerzas, y que una fuga con escaladores/rodadores
 * tenga más opciones de ganar».
 *
 * Y es un banco que hacía falta de verdad, porque el motor tenía DOS caricaturas y ningún término
 * medio: una llana que es g = 0 durante 180 km y una reina que es un solo puerto al 8 %. La media
 * montaña no la decide un puerto sino la ACUMULACIÓN —siete cotas cortas no descuelgan a nadie de
 * golpe pero vacían el depósito— y en ella el sprinter puro llega, pero llega sin piernas.
 *
 * El campo es el de la llana con dos manos de escaladores-rodadores más: los que en la carretera
 * ganan estas etapas.
 */
export function mediumMountainScenario(): Scenario {
  const riders: StageRider[] = []
  riders.push(...sprintersEnDegradado(55, { MON: 48 }))
  // Los que ganan una media montaña: aguantan las cotas y rematan un grupo pequeño.
  for (let i = 0; i < 5; i++) {
    riders.push(
      rider(`pun-${i}`, {
        eff0: eff(58, { MON: 70 + (i % 4), COL: 68, LLA: 68, SPR: 70, TAC: 62 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestClimbs: true }),
      }),
    )
  }
  for (let i = 0; i < 5; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(56, { TAC: 62, LLA: 68, MON: 64 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  for (let i = 0; i < 156; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(56, { LLA: 62 + (i % 8), MON: 56 + (i % 6) }) }))
  }
  /**
   * OCHO COTAS QUE MUERDEN, CON SU BAJADA, Y LA ÚLTIMA A DIEZ KILÓMETROS (v38).
   *
   * La primera versión ponía siete cotas de 3-5 km al 5-7 % separadas por veinte kilómetros de
   * llano y sin una sola bajada —o sea que después de coronar se aparecía por arte de magia abajo—,
   * y remataba con 17 km de llano. Medido sobre 60 etapas: el ganador llegaba en un grupo de 31 o
   * más el **94 %** de las veces, la mediana de ese grupo era **168 corredores de 176** y ganaba un
   * velocista 43 de 60. Eso no es una media montaña: es una llana con relieve.
   *
   * Dos cosas lo explicaban. Una, que 1.680 m de desnivel en 190 km no vacían a nadie. Y otra, que
   * el motor solo DISPUTA las cotas de los últimos `climbRaceKmToGo` km: de las siete, seis se
   * subían al paseo y la única que se corría coronaba a 27 km de meta, con diecisiete de llano
   * detrás para que volviera todo el mundo.
   *
   * Ahora son ocho cotas de 4 a 6 km al 6-8 % con su descenso detrás —2.700 m, que es lo que tiene
   * una media montaña de verdad—, las tres últimas caen dentro de la ventana en que se corre, y la
   * de arriba corona a diez kilómetros de meta. Sigue sin acabar en alto, que es lo que pidió el
   * dueño: «una clásica así con algo de montaña pero que no acabe en alto».
   */
  const segments: StageInput['profile']['segments'] = []
  segments.push({ km: 12, tipo: 'llano' })
  for (let c = 0; c < 8; c++) {
    const largo = 4 + (c % 3)
    const rampa = 6 + (c % 3)
    segments.push({ km: largo, tipo: 'puerto', tramos: [{ km: largo, g: rampa }] })
    segments.push({ km: largo, tipo: 'descenso' })
    // El llano entre cota y cota mengua: la etapa se va apretando hacia el final, como se dibuja.
    if (c < 7) segments.push({ km: 14 - c, tipo: 'llano' })
  }
  segments.push({ km: 10, tipo: 'llano' })
  return {
    name: 'media-190',
    input: { profile: { segments, banners: [] }, riders: inTeams(riders, 8) },
    bestSprinterId: 'spr-0',
  }
}

/**
 * Etapa reina (SPEC 6.17): 135 km de llano y un puerto final de 15 km al 8% con meta en alto.
 * Líderes de la general en el pelotón (reservones: no fugan), baroudeurs combativos que forman
 * la fuga, sprinters que se descuelgan y gregarios de relleno.
 */
export function queenScenario(): Scenario {
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
  for (let i = 0; i < 3; i++) {
    riders.push(rider(`spr-${i}`, { eff0: eff(52, { SPR: 84, LLA: 66, MON: 42 }) }))
  }
  // Un pelotón de verdad (v38): 176 corredores en 22 equipos de 8, que es lo que corre el juego.
  for (let i = 0; i < 163; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(55, { MON: 54 + (i % 12), LLA: 60 }) }))
  }
  return {
    name: 'reina-150',
    input: {
      profile: {
        segments: [
          { km: 135, tipo: 'llano' },
          { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
        ],
        banners: [{ km: 150, tipo: 'cima' }],
      },
      riders: inTeams(riders, 8),
    },
    bestSprinterId: 'gc-3',
  }
}

/**
 * La MISMA etapa reina, corrida por el mismo campo en la tercera semana de una gran vuelta: el
 * depósito de cada corredor sale de `initialEnergy` con un TSB hundido, en vez de los 100 planos.
 * Es el escenario que verifica el objetivo alto de la tabla de erosión (docs/motor.md §VI.1) y la
 * razón de ser del Cambio 0: la fatiga acumulada tiene que llegar al depósito.
 */
export function queenThirdWeekScenario(): Scenario {
  const base = queenScenario()
  const energy = initialEnergy(THIRD_WEEK_CTL, THIRD_WEEK_TSB, 'sano')
  return {
    ...base,
    name: 'reina-150-s3',
    input: {
      ...base.input,
      riders: base.input.riders.map((r) => ({ ...r, energy, tsb: THIRD_WEEK_TSB })),
    },
  }
}

/**
 * Campo HOMOGÉNEO de 40 corredores medios (todo a 60, depósito lleno): el banco de pruebas del
 * DESGASTE de un recorrido. Todos iguales a propósito —mismo perfil, mismas órdenes, mismo tanque—
 * para que lo único que explique la erosión sea el RECORRIDO. Con RES 60 el umbral de erosión queda
 * en 0.31 (`erosionThresholdBase + 0.40·RES/100`).
 */
function uniformField(): StageRider[] {
  /**
   * …Y CON EQUIPOS Y PELOTÓN DE VERDAD DESDE LA v38. El campo sigue siendo homogéneo en ATRIBUTOS —que es de lo que iba
   * este banco: que lo único que explique la erosión sea el recorrido— pero ya no es un campo de
   * cuarenta agentes libres. Sin equipos no hay dueño del frente ni presupuesto que se agote; y con
   * cuarenta corredores, el turno de ocho hace que el corredor MEDIANO pase el 19,6 % de la etapa
   * dando la cara, contra el 3,5 % de un pelotón de 176 (medido con la sonda). Con el coste del
   * viento de la v38 esa diferencia lo es todo, así que el desgaste medido no era el del pelotón que
   * corre el juego. Ahora son 176 en 22 equipos de 8; nadie cambia de piernas.
   */
  const riders = Array.from({ length: 176 }, (_, i) =>
    rider(`uni-${i}`, {
      eff0: eff(60),
      fragility: 1,
      ...(i < 22 ? { orders: orders({ role: 'lider' }) } : {}),
    }),
  )
  return inTeams(riders, 8)
}

/**
 * Una carrera de un día REAL del calendario, corrida por el campo homogéneo. No es un perfil de
 * laboratorio: es el recorrido que el juego corre de verdad, con sus puertos, su pavé y su relieve
 * reconstruido. Los perfiles sintéticos y lisos de `llana-180` y `reina-150` no bastan para calibrar
 * el desgaste —una llana canónica es g = 0 durante 180 km, y ningún recorrido real lo es—, y por eso
 * las clásicas largas saturaron la erosión sin que ningún invariante se enterase.
 */
export function realRaceScenario(raceId: string, stageIndex = 1): Scenario {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) throw new Error(`Escenario: no existe la carrera ${raceId}`)
  const stage = race.stages.find((s) => s.index === stageIndex)
  if (!stage) throw new Error(`Escenario: ${raceId} no tiene etapa ${stageIndex}`)
  return {
    name: stageIndex === 1 ? raceId : `${raceId}-e${stageIndex}`,
    input: { profile: stage.profile, riders: uniformField() },
    bestSprinterId: 'uni-0',
  }
}

/**
 * Una etapa REINA REAL de gran vuelta (Race France, etapa 18: 185 km con final en alto), corrida
 * por el campo homogéneo en la TERCERA SEMANA. Es el punto ciego que dejaba la batería: la reina
 * canónica es una caricatura (135 km lisos más un puerto) y el escenario fatigado corría sobre ella,
 * así que nadie medía lo que hace una etapa de montaña de verdad con el depósito ya mermado.
 * Medido, ahí el 100% del campo entraba en pájara y la erosión saturaba (ver docs/balance.md).
 */
export function realQueenThirdWeekScenario(): Scenario {
  const base = realRaceScenario('race-france', 18)
  const energy = initialEnergy(THIRD_WEEK_CTL, THIRD_WEEK_TSB, 'sano')
  return {
    ...base,
    name: 'reina-real-s3',
    input: {
      ...base.input,
      riders: base.input.riders.map((r) => ({ ...r, energy, tsb: THIRD_WEEK_TSB })),
    },
  }
}

/**
 * La CLÁSICA LARGA canónica: el Ronde van Vlaanderen real (278 km, 16 muros, 6 sectores de pavé).
 * Es el monumento tipo del calendario y el punto donde se mide el objetivo de erosión de la clásica
 * larga (docs/motor.md §VI.1).
 */
export function longClassicScenario(): Scenario {
  return realRaceScenario('race-flanders')
}

/**
 * La clásica MÁS DURA del calendario: Il Lombardia real (241 km y ~4.100 m de desnivel). Es el peor
 * caso, y el que reventó la escala: gastaba 117 de un depósito de 100, así que el pelotón entero
 * entraba en pájara y la erosión topaba en 1,000 (deja de discriminar y el resultado vuelve a ser
 * azar). Este escenario existe para que eso no pueda repetirse en silencio.
 */
export function hardestClassicScenario(): Scenario {
  return realRaceScenario('race-lombardy')
}

/**
 * Contrarreloj individual de 40 km llanos (SPEC 6.13, 6.17): 8 especialistas y 32 corredores de
 * crono correcto. El mejor especialista gana y la brecha p90-p10 mide 2-4 minutos.
 */
export function timeTrialScenario(): Scenario {
  const riders: StageRider[] = []
  for (let i = 0; i < 8; i++) {
    riders.push(rider(`cri-${i}`, { eff0: eff(60, { CRI: 80 + (i % 5), RES: 72, LLA: 68 }) }))
  }
  for (let i = 0; i < 32; i++) {
    riders.push(rider(`pel-${i}`, { eff0: eff(58, { CRI: 66 + (i % 10), RES: 64, LLA: 62 }) }))
  }
  return {
    name: 'cri-40',
    input: { profile: { segments: [{ km: 40, tipo: 'llano' }] }, riders, timeTrial: true },
    bestSprinterId: 'cri-4', // el especialista con CRI más alto (80 + 4)
  }
}

/** Semillas deterministas de una campaña de N etapas del mismo escenario. */
export function campaignSeeds(scenario: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    stageSeed({ worldSeed: `${scenario}-${i}`, raceId: scenario, stageDay: 1, engineVersion: 1 }),
  )
}
