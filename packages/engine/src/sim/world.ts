/**
 * EL BANCO DE MUNDO (G1): el Montecarlo de etapas, llevado a las TEMPORADAS.
 *
 * Todos los bancos de `sim/` miden lo que pasa en una etapa o en una carrera. Ninguno mide lo que le
 * pasa a la POBLACIÓN con el tiempo, y por eso la EPIC de entrenamientos no se podía contestar más
 * que con una opinión. El dueño fue explícito: «no estoy muy convencido de que funcione bien; quiero
 * una revisión muy detallada de esto», y lo que tiene que cumplirse a la vez es:
 *
 *  - que **no** acaben todos siendo Pogačar con todo a cinco estrellas;
 *  - que **tampoco** se quede nadie sin pasar de cuatro en nada;
 *  - que las diferencias entre el mejor y la media **no se aplanen**.
 *
 * Las tres son preguntas sobre una distribución después de años, no sobre un corredor después de un
 * día. Este banco corre N temporadas de 364 días con su relevo generacional —los viejos se retiran,
 * entran neoprofesionales— y saca la foto de la población al final de cada una.
 *
 * AQUÍ SE ENTRENA **Y SE CORRE** (v54). La primera versión de este banco solo entrenaba, y su
 * cabecera decía que correr no enseñaba: era falso —`raceLearning` reparte atributos a todo el que
 * termina una etapa, y lleva haciéndolo mucho— y con esa venda el banco no podía ver la mitad de la
 * progresión de un profesional. Ahora cada corredor tiene sus días de carrera, sorteados del
 * calendario REAL de su división con su clase y su terreno.
 *
 * LO QUE SIGUE SIN MEDIR, y hay que decirlo: no se simulan las etapas. La carga de un día de
 * carrera es representativa por terreno, no medida corredor a corredor, y aquí no gana nadie. Lo
 * que este banco contesta es cuánto CRECE una población que entrena y compite; para saber quién
 * gana están los otros bancos.
 *
 * Puro y determinista: todo el azar sale de `seededRng`.
 */
import {
  ATTRIBUTES,
  ATTRIBUTE_GROWTH,
  type Attribute,
  DAYS_PER_SEASON,
  RIDER_ARCHETYPES,
  type RiderArchetype,
  VOCATIONS,
  type TrainingChoice,
  type Vocation,
  archetypeFromAttributes,
  attrStarsWhole,
  defaultCoachPlan,
  seededRng,
} from '@cyclingstar/shared'
import { applyDailyLoad } from '../banister.js'
import { RACE_DAY_TSS, RACE_DAY_TSS_DEFAULT } from '../constants.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { generateRiderGenome } from '../creation.js'
import { kDim, simulateRiderDay } from '../progression.js'
import { raceLearning } from '../world/learning.js'
import { neoproAge, shouldRetire } from '../world/lifecycle.js'
import { type Division, generateNpcRider, sampleNpcAge } from '../world/npc.js'

/** Un corredor del mundo, con lo que hace falta para simularle un día y para envejecerle. */
interface WorldRider {
  riderId: string
  division: Division
  /** Para qué es este corredor: desde la v53 decide qué le entrena su entrenador. */
  vocation: Vocation
  age: number
  attributes: Record<Attribute, number>
  ceilings: Record<Attribute, number>
  talent: number
  fragility: number
  peakAge: number
  declineAge: number
  ctl: number
  atl: number
  morale: number
  health: 'sano' | 'molestias' | 'enfermo' | 'lesionado'
  healthUntilDay: number | null
  /** En qué temporada entró: separa a los que crecieron aquí de los del reparto inicial. */
  debutSeason: number
  /**
   * QUÉ MOVIÓ Y EN QUÉ DÍA, para amortiguar el declive de la semana (`trainedLast7`). En producción
   * esto sale de `rider_attr_log`; aquí el banco lleva su propio registro en memoria, porque si lo
   * aproximara con «lo de hoy» estaría midiendo un declive distinto del que corre el juego, y esa
   * asimetría entre banco y producción es justo lo que este rediseño se prohíbe.
   */
  movidoElDia: Map<Attribute, number>
  /**
   * LO QUE PASA DENTRO DE LA TEMPORADA, que una foto de diciembre no puede contar.
   *
   * `margenAlTechoPct` y compañía se leen del estado final y con eso basta. Pero «cuánto se aprende
   * corriendo, por cohorte de edad» y «cuántos días al año se pasa uno malo» son acumulados: si no
   * se cuentan mientras ocurren, en la foto ya no están. Se ponen a cero al empezar cada temporada.
   */
  temporada: {
    /** Puntos de atributo ganados EN CARRERA, y en cuántos días de carrera se ganaron. */
    aprendidoEnCarrera: number
    diasDeCarrera: number
    /** Días con la salud rota, separados porque no cuestan lo mismo ni se arreglan igual. */
    diasEnfermo: number
    diasConMolestias: number
    /** La carta —su mejor especialidad— el 1 de enero, para medir cuánto creció en el año. */
    cartaAlEmpezar: number
    /** RES y TAC al empezar: las dos que el diseño quiere ver crecer por separado. */
    resAlEmpezar: number
    tacAlEmpezar: number
  }
}

/** Las seis especialidades. La «carta» de un corredor es la mejor de ellas. */
const CARTAS: Attribute[] = ['SPR', 'MON', 'COL', 'PAV', 'CRI', 'LLA']
const cartaDe = (r: { attributes: Record<Attribute, number> }): number =>
  Math.max(...CARTAS.map((a) => r.attributes[a]))

/** Sin cuatro estrellas en NADA físico: la otra mitad del miedo del dueño. */
const sinCuatroEstrellas = (r: { attributes: Record<Attribute, number> }): boolean =>
  FISICOS.every((a) => attrStarsWhole(r.attributes[a]) < 4)

/** Las tres cohortes de edad con las que se leen el margen y lo aprendido. */
const cohorteDe = (age: number): 'joven' | 'medio' | 'veterano' =>
  age <= 23 ? 'joven' : age <= 27 ? 'medio' : 'veterano'

/**
 * El reparto del mundo por divisiones. No es decorado: la división fija la media de atributos con la
 * que nace un NPC (`NPC.divisionPrimaryMu`), así que de ella sale el ancho de la población, que es
 * justo lo que este banco mide.
 */
const PLANTILLA: readonly { division: Division; equipos: number; por: number }[] = [
  { division: 'WT', equipos: 22, por: 8 },
  { division: 'PRS', equipos: 20, por: 7 },
  { division: 'CON', equipos: 18, por: 7 },
]

/** Un día de carrera del calendario: qué clase de carrera y qué terreno. */
interface DiaDeCarrera {
  raceClass: string
  kind: string
  /** Carga del día, en TSS. Sale del terreno: una reina cuesta el doble que una llana. */
  tss: number
}

/**
 * La carga de un día de carrera por terreno vive en `constants.ts` (`RACE_DAY_TSS`) desde el paso 0
 * del rediseño de entrenamiento: la aproximación que este banco ASUME va a alimentar también el
 * esfuerzo del día y el índice de etapa, y una aproximación con tres consumidores no puede seguir
 * escondida dentro del fichero de uno de ellos. Los números no cambiaron al mudarse.
 *
 * Lo que este banco mide bien es CUÁNTO SE APRENDE compitiendo, que es lo que pide G1; lo que no
 * mide es quién gana.
 */

/**
 * EL CALENDARIO QUE PUEDE CORRER CADA DIVISIÓN, sacado del calendario REAL del juego y no inventado.
 *
 * De cada carrera a la que su división puede inscribirse (`openTo`) se toman todas sus etapas con su
 * terreno y la clase de la carrera. De esa bolsa sale luego, al azar, el día de carrera de cada
 * corredor: así un equipo WorldTour corre sobre todo WorldTour y un continental sobre todo .2, que
 * es justo lo que hace que el nivel de la carrera signifique algo para lo que se aprende.
 */
function calendarioDe(division: Division): DiaDeCarrera[] {
  const dias: DiaDeCarrera[] = []
  for (const race of SEASON_CALENDAR) {
    // Los campeonatos nacionales son campo individual por país: no son calendario de equipo.
    if (race.championshipCountry != null) continue
    if (!race.openTo.includes(division)) continue
    for (const st of race.stages) {
      dias.push({
        raceClass: race.raceClass,
        kind: st.kind,
        tss: RACE_DAY_TSS[st.kind] ?? RACE_DAY_TSS_DEFAULT,
      })
    }
  }
  return dias
}

const CALENDARIO: Record<Division, DiaDeCarrera[]> = {
  WT: calendarioDe('WT'),
  PRS: calendarioDe('PRS'),
  CON: calendarioDe('CON'),
}

/**
 * CUÁNTOS DÍAS DE CARRERA HACE UN CORREDOR AL AÑO. Un profesional de primer nivel anda entre 55 y
 * 75; se toma un valor central y el mismo para todos, porque lo que este banco compara es el efecto
 * del NIVEL de la carrera, no el de correr más o menos.
 */
const DIAS_DE_CARRERA = 65

/**
 * LOS TRES BRAZOS DEL BANCO (paso 1 del rediseño de entrenamiento).
 *
 * Un banco con un solo brazo mide, pero no PRUEBA: dice qué pasa, no si lo que pasa se debe a lo que
 * uno cree. Los tres de aquí existen para contestar tres preguntas que el dueño hizo con palabras
 * distintas y que hasta ahora se contestaban con una opinión.
 */

/**
 * 1) LA POLÍTICA DE ENTRENAMIENTO. «Que el entrenador bot sea razonable, nunca óptimo» solo se puede
 * probar comparándolo contra un entrenador MEJOR y contra uno PEOR sobre el mismo corredor sembrado
 * y el mismo calendario. Si el bot no queda en medio, la frase es un deseo.
 *
 * - `bot`: el de producción (`defaultCoachPlan`), tal cual.
 * - `buena`: el mismo ciclo, pero con las tres cosas que hace un entrenador que mira al corredor —no
 *   machacar en rojo, afinar antes de competir, y descansar de verdad después—.
 * - `mala`: construcción fuerte todos los días y sin afinar nunca. No es un espantapájaros: es
 *   exactamente lo que hace un jugador que confunde entrenar con sufrir.
 */
export type Politica = 'bot' | 'buena' | 'mala'

/** Cuántos días antes de competir afina un entrenador bueno: más recuperación, menos afinado. */
const afinadoPorREC = (rec: number): number => Math.round(9 - (4 * Math.min(100, rec)) / 100)

function planDelDia(
  politica: Politica,
  gameDay: number,
  vocation: Vocation,
  tsb: number,
  rec: number,
  diasHastaCorrer: number,
): TrainingChoice {
  if (politica === 'mala') return { session: 'fondo', intensity: 'fuerte' }
  const base = defaultCoachPlan(gameDay, vocation)
  if (politica === 'bot') return base
  // Afinar: los días previos a competir se baja el pistón, salvo que ya toque descansar.
  if (diasHastaCorrer >= 0 && diasHastaCorrer <= afinadoPorREC(rec)) {
    if (base.session === 'descanso_total' || base.session === 'descanso_activo') return base
    return { session: base.session, intensity: 'suave' }
  }
  // No machacar en rojo: el `fuerte` del ciclo solo se paga con el depósito por encima de −10.
  if (base.intensity === 'fuerte' && tsb <= -10)
    return { session: base.session, intensity: 'normal' }
  return base
}

/**
 * 2) EL APRENDIZAJE DE LA CARRERA, CON Y SIN FRENO. El rediseño propone meter `kDim` en
 * `raceLearning`, y el precio declarado es grande: correr enseñaría alrededor de la mitad de puntos
 * brutos. Este brazo lo mide ANTES de tocar el motor —la fórmula de producción no cambia una coma—,
 * que es la diferencia entre decidir con un número y decidir con un argumento.
 */
export type Aprendizaje = 'hoy' | 'conKDim'

/** Opciones de una corrida del mundo. Por defecto, el mundo tal y como se juega hoy. */
export interface WorldOptions {
  sinCarreras?: boolean
  politica?: Politica
  aprendizaje?: Aprendizaje
}

function nace(seed: string, division: Division, age: number, debutSeason: number): WorldRider {
  const rng = seededRng(`${seed}:voc`)
  const vocation: Vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]!
  const g = generateNpcRider(seed, { division, vocation, age })
  const r = seededRng(`${seed}:forma`)
  return {
    riderId: seed,
    division,
    vocation,
    age,
    attributes: { ...g.attributes },
    ceilings: { ...g.hidden.ceilings },
    talent: g.hidden.talent,
    fragility: g.hidden.fragility,
    peakAge: g.hidden.peakAge,
    declineAge: g.hidden.declineAge,
    // Arranca con fondo hecho y razonablemente fresco, como el resto de los bancos.
    ctl: 45 + 30 * r(),
    atl: 40 + 20 * r(),
    morale: 55 + 20 * r(),
    health: 'sano',
    healthUntilDay: null,
    debutSeason,
    movidoElDia: new Map(),
    temporada: nuevaTemporada(g.attributes),
  }
}

/** Los atributos que se movieron en los últimos siete días, y limpieza de lo viejo de paso. */
function movidosEnLaSemana(r: WorldRider, gameDay: number): ReadonlySet<Attribute> {
  const out = new Set<Attribute>()
  for (const [attr, dia] of r.movidoElDia) {
    if (gameDay - dia <= TRAINED_WINDOW_DAYS && dia < gameDay) out.add(attr)
    else if (gameDay - dia > TRAINED_WINDOW_DAYS) r.movidoElDia.delete(attr)
  }
  return out
}

/** La ventana de «esa semana» del SPEC, igual que en producción. */
const TRAINED_WINDOW_DAYS = 7

/** Los acumuladores del año, a cero. La carta, RES y TAC se guardan como estaban al empezar. */
function nuevaTemporada(attrs: Record<Attribute, number>): WorldRider['temporada'] {
  return {
    aprendidoEnCarrera: 0,
    diasDeCarrera: 0,
    diasEnfermo: 0,
    diasConMolestias: 0,
    cartaAlEmpezar: Math.max(...CARTAS.map((a) => attrs[a])),
    resAlEmpezar: attrs.RES,
    tacAlEmpezar: attrs.TAC,
  }
}

/** La foto de la población al final de una temporada: es lo que contesta las preguntas de G1. */
export interface WorldSeasonRow {
  season: number
  riders: number
  /** Cuántos se retiraron al acabar la temporada, y cuántos neoprofesionales entraron. */
  retired: number
  neopros: number
  /**
   * ¿ACABAN TODOS SIENDO POGAČAR? Y ESO NO ES «CINCO ESTRELLAS EN TODO».
   *
   * La primera versión de este banco medía el % de corredores con 5★ en TODOS los atributos físicos
   * y daba 0,00 % en las 25 temporadas. Tranquilizador y casi vacío: el dueño lo corrigió —«cuando
   * digo cinco estrellas en todo no estoy siendo literal; Pogačar tiene muchas cinco estrellas, pero
   * posiblemente no en todo»— y tenía razón. Un listón que no cumple ni el mejor corredor del mundo
   * real no puede dispararse nunca, y un indicador que no puede dispararse no vigila nada.
   *
   * Lo que se mide ahora es la FORMA de la élite: cuántos atributos de cinco estrellas acumula un
   * corredor. `estrellas5Medias` es la media del pelotón, `estrellas5Mejor` el máximo del mundo y
   * `cracksPct` el % con TRES o más, que es el perfil «crack» del que habla el dueño. Si esos tres
   * suben temporada a temporada, la progresión satura y el juego se queda sin jerarquía.
   */
  estrellas5Medias: number
  estrellas5Mejor: number
  cracksPct: number
  /**
   * …Y LA OTRA MITAD DEL MIEDO: el % de corredores que no llegan a cuatro estrellas en NADA. Un
   * pelotón entero de medianías es tan malo como uno de superhombres.
   */
  sinNadaSobre4Pct: number
  /** Media de la MEDIA de atributos del corredor: dónde está el centro de la población. */
  mediaGlobal: number
  /** El mejor del mundo, por media de atributos. */
  mejor: number
  /** La mediana. La distancia entre ésta y `mejor` es «¿se aplanan las diferencias?». */
  mediana: number
  /** El ancho de la población: p90 − p10 de la media de atributos. */
  anchoP90P10: number
  /**
   * CUÁNTO MARGEN LE QUEDA AL MUNDO, en % del techo. Es el diagnóstico que separa «la progresión
   * está bien calibrada» de «ya no puede crecer nadie»: si esto se va a cero, el mundo está
   * congelado aunque los otros números parezcan sanos.
   */
  margenAlTechoPct: number
  /**
   * …Y CUÁNTOS ESTÁN CONGELADOS DEL TODO: el % de corredores cuyo techo YA es su atributo en todo lo
   * físico. Para ésos el entrenamiento no es que rinda poco, es que rinde CERO —`kDim` devuelve 0 en
   * cuanto el atributo alcanza el techo—, y ninguna perilla de `TRAINING` les puede mover.
   *
   * Va aparte de `margenAlTechoPct` porque una media esconde justo esto: un mundo con la mitad del
   * pelotón congelado y la otra mitad con 20 puntos de margen da la misma media que uno con todo el
   * pelotón a 10, y son mundos completamente distintos. Ésta es la pregunta de G1 que ninguna media
   * contesta: ¿a cuánta gente le sirve de algo entrenar?
   */
  congeladosPct: number
  /** Edad media del pelotón: vigila que el relevo generacional no se descontrole. */
  edadMedia: number

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // LA FOTO DE ANTES (paso 0 del rediseño de entrenamiento). Todo lo que sigue MIDE y NO VIGILA:
  // ninguna de estas filas tiene banda todavía, a propósito. Primero se sabe qué hace el mundo de
  // hoy y se escribe en la bitácora; las bandas se ponen al final, cuando haya contra qué
  // compararlas. Poner la banda antes que la medida es escribir el resultado que uno espera.
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * LA BANDA DEL DUEÑO, PERO MEDIDA DONDE VIVE. «Claramente menos del 15 % de momento, y cuando haya
   * humanos buenos bajaremos eso a 0»: el % de WorldTour con AL MENOS un atributo de cinco
   * estrellas. Se mide sobre el WT y no sobre el mundo porque un continental con un 84 no es el
   * problema del que hablaba, y se mira en régimen y no al nacer: la generación reparte una cosa y
   * los años reparten otra.
   */
  cincoEstrellasWTPct: number
  /** Lo mismo, solo entre los 26 y los 31: la élite ya hecha, sin promesas ni veteranos. */
  cincoEstrellasWTMadurosPct: number
  /** Medianías, pero dentro del WorldTour: un WT entero de gregarios también es un defecto. */
  sinNadaSobre4WTPct: number
  /** …y quitando a los que SON gregarios, que es el número que de verdad alarma. */
  sinNadaSobre4NoGregariosWTPct: number

  /**
   * EL REPARTO DEL MUNDO POR ARQUETIPO, derivado de los atributos y no de la etiqueta de la ficha.
   * Si un arquetipo se vacía, el juego ha perdido una forma de correr aunque las medias estén bien.
   */
  arquetiposPct: Record<RiderArchetype, number>
  /** ¿Hay especialistas PUROS? Velocistas WT maduros con SPR de 4★ y MON flojo, y al revés. */
  purosVelocistasPct: number
  purosEscaladoresPct: number
  /** ¿El mejor esprínter del mundo es un esprínter? Los tres a la vez, o no cuenta. */
  mejorPorArquetipoOk: number

  /**
   * MARGEN AL TECHO PARTIDO EN DOS, que es la pregunta de G1 que la media global esconde. El motor
   * y el oficio no se aprenden igual ni a la misma edad, así que un solo número los promedia y deja
   * de decir nada. `ATTRIBUTE_GROWTH` ya hacía esta partición para el declive; aquí se usa para ver
   * crecer.
   */
  margenMotorPct: number
  margenOficioPct: number
  /** Y por cohorte de edad: a los 21 tiene que sobrar margen; a los 30 es normal que no. */
  margenJovenesPct: number
  margenMediosPct: number
  margenVeteranosPct: number
  /** % de la cohorte de 19 a 23 con OCHO puntos de margen medio o más. */
  jovenesConMargenPct: number

  /** Cuánto crece la carta de un neoprofesional del WorldTour en su primera temporada. */
  crecimientoNeoproWT: number
  /**
   * Media de techos de carta de los neopros menos la de la generación inicial, por división.
   *
   * `null` cuando ya no queda NADIE de la generación inicial con quien comparar —hacia la
   * temporada 20 se han retirado todos—, porque entonces no es que la diferencia sea cero: es que
   * no hay diferencia que medir, y escribir un 0 ahí sería inventarse un dato tranquilizador.
   */
  techosNeoprosVsGen0: Record<Division, number | null>

  /**
   * LAS CURVAS DE EDAD, que son la forma de comprobar que un veterano no es un joven con más años.
   * Aeróbico (MON+RES+LLA) y neuromuscular (SPR+COL) contra la cohorte de plenitud, y el oficio
   * (TAC) como diferencia absoluta porque es el que tiene que subir siempre.
   */
  curvaEdadAerobicaJoven: number
  curvaEdadAerobicaVeterana: number
  curvaEdadNeuroJoven: number
  curvaEdadNeuroVeterana: number
  curvaEdadTAC: number
  /** Los de 34 o más contra los de 28 a 30: el declive tiene que verse. */
  vets34vs28: number

  /** Congelados, pero solo entre los que aún no han llegado al declive: ésos sí son un defecto. */
  congeladosJovenesPct: number

  /**
   * LO QUE ENSEÑA CORRER, EN PUNTOS POR DÍA DE CARRERA Y POR COHORTE. Es la fila que vigila que la
   * sustitución del banco por la producción no cambie lo que se aprende: aquí sale la columna del
   * banco, y la de producción llega cuando el paso que la mide exista.
   */
  aprendidoJovenes: number
  aprendidoMedios: number
  aprendidoVeteranos: number

  /** Días de salud rota por corredor y año, contando también los de carrera. */
  enfermedadesAno: number
  diasMolestiasAno: number

  /** Cuánto gana al año un bot con el plan del entrenador en las dos que el diseño quiere ver. */
  ganaRESporAno: number
  ganaTACporAno: number
}

const FISICOS: Attribute[] = ATTRIBUTES.filter((a) => a !== 'TAC')

const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
const cuantil = (xs: number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0
}

function foto(
  season: number,
  field: WorldRider[],
  retired: number,
  neopros: number,
): WorldSeasonRow {
  const medias = field.map((r) => media(FISICOS.map((a) => r.attributes[a])))
  const cincos = field.map(
    (r) => FISICOS.filter((a) => attrStarsWhole(r.attributes[a]) >= 5).length,
  )
  const cracks = cincos.filter((n) => n >= 3).length
  const medianias = field.filter((r) => sinCuatroEstrellas(r)).length
  const margen = field.flatMap((r) =>
    FISICOS.map((a) => Math.max(0, r.ceilings[a] - r.attributes[a])),
  )
  const techos = field.flatMap((r) => FISICOS.map((a) => r.ceilings[a]))
  const congelados = field.filter((r) =>
    FISICOS.every((a) => r.attributes[a] >= r.ceilings[a]),
  ).length

  // ── La foto de antes: todo lo que sigue mide y no vigila ────────────────────────────────────
  const pct = (n: number, de: number): number => (100 * n) / Math.max(1, de)
  const arquetipos = new Map<string, RiderArchetype>(
    field.map((r) => [r.riderId, archetypeFromAttributes(r.attributes)]),
  )
  const wt = field.filter((r) => r.division === 'WT')
  const wtMaduros = wt.filter((r) => r.age >= 26 && r.age <= 31)
  const tieneCinco = (r: WorldRider): boolean =>
    FISICOS.some((a) => attrStarsWhole(r.attributes[a]) >= 5)

  const repartoArq = Object.fromEntries(
    RIDER_ARCHETYPES.map((a) => [
      a,
      pct(field.filter((r) => arquetipos.get(r.riderId) === a).length, field.length),
    ]),
  ) as Record<RiderArchetype, number>

  // Puro = destaca en lo suyo Y NO en lo contrario. Un escalador que también esprinta no es puro,
  // y un mundo sin puros es un mundo donde da igual con quién corras.
  const puros = (arq: RiderArchetype, carta: Attribute, contraria: Attribute): number => {
    const suyos = wtMaduros.filter((r) => arquetipos.get(r.riderId) === arq)
    const p = suyos.filter((r) => r.attributes[carta] >= 68 && r.attributes[contraria] <= 55)
    return pct(p.length, suyos.length)
  }

  // El mejor del mundo en una carta tiene que SER de esa casa. Los tres a la vez: un acierto suelto
  // puede ser suerte, los tres seguidos no.
  const mejorEs = (carta: Attribute, arq: RiderArchetype): boolean => {
    const top = field.reduce((a, b) => (b.attributes[carta] > a.attributes[carta] ? b : a))
    return arquetipos.get(top.riderId) === arq
  }
  const mejorOk =
    mejorEs('SPR', 'velocidad') && mejorEs('MON', 'escalada') && mejorEs('PAV', 'clasicas')

  const margenDe = (rs: WorldRider[], attrs: Attribute[]): number => {
    if (rs.length === 0) return 0
    const m = rs.flatMap((r) => attrs.map((a) => Math.max(0, r.ceilings[a] - r.attributes[a])))
    const t = rs.flatMap((r) => attrs.map((a) => r.ceilings[a]))
    return pct(media(m), media(t))
  }
  const motor = FISICOS.filter((a) => ATTRIBUTE_GROWTH[a] === 'motor')
  const oficio = ATTRIBUTES.filter((a) => ATTRIBUTE_GROWTH[a] === 'oficio')
  const porCohorte = (c: 'joven' | 'medio' | 'veterano'): WorldRider[] =>
    field.filter((r) => cohorteDe(r.age) === c)

  const jovenes = field.filter((r) => r.age >= 19 && r.age <= 23)
  const conMargen = jovenes.filter(
    (r) => media(FISICOS.map((a) => Math.max(0, r.ceilings[a] - r.attributes[a]))) >= 8,
  )

  /**
   * Neopros del WorldTour que acaban de correr SU PRIMERA temporada entera, o sea los que entraron
   * al final de la anterior: `debutSeason === season` son los que se acaban de dar de alta hace un
   * instante —el relevo generacional ocurre justo antes de esta foto— y llevan cero días corridos,
   * así que su crecimiento sería 0 por construcción y la fila no diría nada.
   */
  const crecimiento = field.filter((r) => r.division === 'WT' && r.debutSeason === season - 1)
  const techoCartaDe = (r: WorldRider): number => Math.max(...CARTAS.map((a) => r.ceilings[a]))
  const techosNeo = Object.fromEntries(
    (['WT', 'PRS', 'CON'] as Division[]).map((d) => {
      const nuevos = field.filter((r) => r.division === d && r.debutSeason > 0)
      const gen0 = field.filter((r) => r.division === d && r.debutSeason === 0)
      if (nuevos.length === 0 || gen0.length === 0) return [d, null]
      return [d, media(nuevos.map(techoCartaDe)) - media(gen0.map(techoCartaDe))]
    }),
  ) as Record<Division, number | null>

  const mediaDe = (rs: WorldRider[], attrs: Attribute[]): number =>
    rs.length === 0 ? 0 : media(rs.flatMap((r) => attrs.map((a) => r.attributes[a])))
  const coh = (min: number, max: number): WorldRider[] =>
    field.filter((r) => r.age >= min && r.age <= max)
  const plenitud = coh(27, 29)
  const razon = (rs: WorldRider[], attrs: Attribute[]): number => {
    const base = mediaDe(plenitud, attrs)
    return base === 0 ? 0 : mediaDe(rs, attrs) / base
  }
  const aerobico: Attribute[] = ['MON', 'RES', 'LLA']
  const neuro: Attribute[] = ['SPR', 'COL']

  const aprendido = (c: 'joven' | 'medio' | 'veterano'): number => {
    const rs = porCohorte(c)
    const dias = rs.reduce((a, r) => a + r.temporada.diasDeCarrera, 0)
    return dias === 0 ? 0 : rs.reduce((a, r) => a + r.temporada.aprendidoEnCarrera, 0) / dias
  }

  const noDeclinan = field.filter((r) => r.age < r.declineAge)

  return {
    season,
    riders: field.length,
    retired,
    neopros,
    estrellas5Medias: media(cincos),
    estrellas5Mejor: Math.max(...cincos),
    cracksPct: pct(cracks, field.length),
    sinNadaSobre4Pct: pct(medianias, field.length),
    mediaGlobal: media(medias),
    mejor: Math.max(...medias),
    mediana: cuantil(medias, 0.5),
    anchoP90P10: cuantil(medias, 0.9) - cuantil(medias, 0.1),
    margenAlTechoPct: pct(media(margen), media(techos)),
    congeladosPct: pct(congelados, field.length),
    edadMedia: media(field.map((r) => r.age)),

    cincoEstrellasWTPct: pct(wt.filter(tieneCinco).length, wt.length),
    cincoEstrellasWTMadurosPct: pct(wtMaduros.filter(tieneCinco).length, wtMaduros.length),
    sinNadaSobre4WTPct: pct(wt.filter(sinCuatroEstrellas).length, wt.length),
    sinNadaSobre4NoGregariosWTPct: (() => {
      const noGreg = wt.filter((r) => arquetipos.get(r.riderId) !== 'gregario')
      return pct(noGreg.filter(sinCuatroEstrellas).length, noGreg.length)
    })(),

    arquetiposPct: repartoArq,
    purosVelocistasPct: puros('velocidad', 'SPR', 'MON'),
    purosEscaladoresPct: puros('escalada', 'MON', 'SPR'),
    mejorPorArquetipoOk: mejorOk ? 100 : 0,

    margenMotorPct: margenDe(field, motor),
    margenOficioPct: margenDe(field, oficio),
    margenJovenesPct: margenDe(porCohorte('joven'), FISICOS),
    margenMediosPct: margenDe(porCohorte('medio'), FISICOS),
    margenVeteranosPct: margenDe(porCohorte('veterano'), FISICOS),
    jovenesConMargenPct: pct(conMargen.length, jovenes.length),

    crecimientoNeoproWT:
      crecimiento.length === 0
        ? 0
        : media(crecimiento.map((r) => cartaDe(r) - r.temporada.cartaAlEmpezar)),
    techosNeoprosVsGen0: techosNeo,

    curvaEdadAerobicaJoven: razon(coh(20, 21), aerobico),
    curvaEdadAerobicaVeterana: razon(coh(33, 35), aerobico),
    curvaEdadNeuroJoven: razon(coh(20, 21), neuro),
    curvaEdadNeuroVeterana: razon(coh(33, 35), neuro),
    curvaEdadTAC: mediaDe(coh(33, 35), ['TAC']) - mediaDe(coh(20, 21), ['TAC']),
    vets34vs28: mediaDe(coh(34, 99), FISICOS) - mediaDe(coh(28, 30), FISICOS),

    congeladosJovenesPct: pct(
      noDeclinan.filter((r) => FISICOS.every((a) => r.attributes[a] >= r.ceilings[a])).length,
      noDeclinan.length,
    ),

    aprendidoJovenes: aprendido('joven'),
    aprendidoMedios: aprendido('medio'),
    aprendidoVeteranos: aprendido('veterano'),

    enfermedadesAno: media(field.map((r) => r.temporada.diasEnfermo)),
    diasMolestiasAno: media(field.map((r) => r.temporada.diasConMolestias)),

    ganaRESporAno: media(field.map((r) => r.attributes.RES - r.temporada.resAlEmpezar)),
    ganaTACporAno: media(field.map((r) => r.attributes.TAC - r.temporada.tacAlEmpezar)),
  }
}

/**
 * Corre un mundo durante `seasons` temporadas y devuelve la foto de cada una.
 *
 * El día a día es el del tick de producción reducido a lo que cambia a un corredor cuando NO corre:
 * el plan del entrenador bot (`defaultCoachPlan`, el mismo que usa `packages/db`), `simulateRiderDay`
 * y nada más. `kInst` y `kStaff` van a 1 —sin instalaciones ni staff que multipliquen— porque este
 * banco mide el MOTOR de progresión, no la economía de un equipo.
 *
 * `sinCarreras` apaga los días de competición y deja el mundo SOLO ENTRENANDO. Es el brazo de
 * control contra el que se compara el mundo completo: hasta la v58 ese brazo era un número escrito
 * a mano en el banco (64,7 de media en la temporada 15), y por eso cualquier cambio en la
 * generación de bots lo tiraba abajo aunque la carrera siguiera enseñando exactamente lo mismo.
 * Medido, no recordado: el brazo se corre.
 */
export function runWorld(
  worldSeed: string,
  seasons: number,
  opciones: WorldOptions = {},
): WorldSeasonRow[] {
  const politica: Politica = opciones.politica ?? 'bot'
  const aprendizaje: Aprendizaje = opciones.aprendizaje ?? 'hoy'
  const rng = seededRng(`${worldSeed}:mundo`)
  const field: WorldRider[] = []
  for (const { division, equipos, por } of PLANTILLA) {
    for (let t = 0; t < equipos; t++) {
      for (let k = 0; k < por; k++) {
        const id = `${division}-${t}-${k}`
        field.push(nace(`${worldSeed}:${id}`, division, sampleNpcAge(`${worldSeed}:${id}:edad`), 0))
      }
    }
  }

  const filas: WorldSeasonRow[] = []
  let siguienteNeopro = 0
  for (let season = 1; season <= seasons; season++) {
    /**
     * LOS DÍAS DE CARRERA DE CADA UNO, sorteados una vez por temporada.
     *
     * Hasta la v54 este banco solo ENTRENABA, y por eso no podía contestar a la cuarta pata de G1:
     * la mitad de la progresión de un profesional ocurre compitiendo (`raceLearning`), y el banco
     * era ciego a ella. Un banco que no lleva algo no puede medirlo.
     *
     * No se simulan las etapas —442 corredores × 364 días × 25 temporadas no terminaría nunca—:
     * se sortean días del calendario REAL de su división, con su clase y su terreno, y se les
     * aplica lo que se aprende y lo que cuestan. Lo que este banco mide bien es CUÁNTO SE APRENDE
     * compitiendo; lo que no mide es quién gana, y para eso están los otros bancos.
     */
    for (const r of field) r.temporada = nuevaTemporada(r.attributes)

    const corre = new Map<string, Map<number, DiaDeCarrera>>()
    for (const r of field) {
      const cal = opciones.sinCarreras === true ? [] : CALENDARIO[r.division]
      const dias = new Map<number, DiaDeCarrera>()
      if (cal.length > 0) {
        const rr = seededRng(`${worldSeed}:${r.riderId}:cal:${season}`)
        for (let i = 0; i < DIAS_DE_CARRERA; i++) {
          // Los días se reparten por la temporada; repetir un día simplemente lo deja como uno.
          const dia = Math.floor(rr() * DAYS_PER_SEASON)
          dias.set(dia, cal[Math.floor(rr() * cal.length)]!)
        }
      }
      corre.set(r.riderId, dias)
    }

    for (let dia = 0; dia < DAYS_PER_SEASON; dia++) {
      const gameDay = (season - 1) * DAYS_PER_SEASON + dia
      for (const r of field) {
        /**
         * EL QUE CORRE HOY NO ENTRENA, igual que en producción (`packages/db/src/train.ts` omite el
         * entrenamiento de quien corrió). Se le aplica la carga de la carrera y lo que le enseña.
         */
        if (r.health === 'enfermo') r.temporada.diasEnfermo += 1
        if (r.health === 'molestias') r.temporada.diasConMolestias += 1

        const hoy = corre.get(r.riderId)?.get(dia)
        if (hoy !== undefined) {
          const sube = raceLearning({
            raceClass: hoy.raceClass as never,
            kind: hoy.kind,
            attributes: r.attributes,
            ceilings: r.ceilings,
          })
          for (const [attr, delta] of Object.entries(sube)) {
            const a = attr as Attribute
            const antes = r.attributes[a]
            // El brazo `conKDim` multiplica por el mismo freno del entrenamiento, sin tocar la
            // fórmula de producción: `raceLearning` devuelve lo de hoy y el freno se aplica aquí.
            const freno = aprendizaje === 'conKDim' ? kDim(antes, r.ceilings[a]) : 1
            r.attributes[a] = Math.min(r.ceilings[a], antes + (delta ?? 0) * freno)
            // Lo que de VERDAD entró, no lo que la fórmula ofrecía: al que ya está en su techo la
            // carrera no le enseña nada, y contar la oferta en vez del cobro taparía justo eso.
            r.temporada.aprendidoEnCarrera += r.attributes[a] - antes
            if (r.attributes[a] !== antes)
              r.movidoElDia.set(a, dia + (season - 1) * DAYS_PER_SEASON)
          }
          r.temporada.diasDeCarrera += 1
          const carga = applyDailyLoad({ ctl: r.ctl, atl: r.atl }, hoy.tss, r.attributes.REC)
          r.ctl = carga.ctl
          r.atl = carga.atl
          continue
        }
        // El plan del entrenador mira la VOCACIÓN desde la v53, así que el banco también: si le
        // diera a todos la semana del completo mediría un mundo que el juego ya no corre.
        /**
         * CUÁNTO FALTA PARA COMPETIR. Solo lo usa la política `buena` para afinar; el bot de
         * producción no mira el calendario y por eso no se lo pasa nadie más. Los días de carrera
         * ya están sorteados para toda la temporada, así que esto es una lectura y no un dado.
         */
        let diasHastaCorrer = -1
        if (politica === 'buena') {
          const suyos = corre.get(r.riderId)
          if (suyos !== undefined) {
            for (let d = dia; d < Math.min(DAYS_PER_SEASON, dia + 10); d++) {
              if (suyos.has(d)) {
                diasHastaCorrer = d - dia
                break
              }
            }
          }
        }
        const choice = planDelDia(
          politica,
          gameDay,
          r.vocation,
          r.ctl - r.atl,
          r.attributes.REC,
          diasHastaCorrer,
        )
        const out = simulateRiderDay(
          {
            attributes: r.attributes,
            ctl: r.ctl,
            atl: r.atl,
            morale: r.morale,
            health: r.health,
            healthUntilDay: r.healthUntilDay,
          },
          {
            gameDay,
            age: r.age,
            ceilings: r.ceilings,
            talent: r.talent,
            fragility: r.fragility,
            peakAge: r.peakAge,
            declineAge: r.declineAge,
            choice,
            kInst: 1,
            kStaff: 1,
            trainedLast7: movidosEnLaSemana(r, gameDay),
            rng: seededRng(`${worldSeed}:${r.riderId}:${gameDay}`),
          },
        )
        for (const a of ATTRIBUTES) {
          if (out.state.attributes[a] > r.attributes[a]) r.movidoElDia.set(a, gameDay)
        }
        r.attributes = out.state.attributes
        r.ctl = out.state.ctl
        r.atl = out.state.atl
        r.morale = out.state.morale
        r.health = out.state.health
        r.healthUntilDay = out.state.healthUntilDay
      }
    }

    // Fin de temporada: cumplen años, se retiran los que toca y entran neoprofesionales a cubrir el
    // hueco. La plantilla del mundo se mantiene: un mundo que se vacía no dice nada de G1.
    let retired = 0
    for (const r of field) r.age += 1
    const siguen = field.filter((r) => {
      const fuera = shouldRetire(
        r.age,
        r.declineAge,
        seededRng(`${worldSeed}:${r.riderId}:retiro:${season}`),
      )
      if (fuera) retired += 1
      return !fuera
    })
    field.length = 0
    field.push(...siguen)
    const neopros = retired
    for (let i = 0; i < neopros; i++) {
      const id = `neo-${season}-${siguienteNeopro++}`
      // Reparto por división proporcional al tamaño de cada categoría.
      const d = rng()
      const division: Division = d < 0.4 ? 'WT' : d < 0.75 ? 'PRS' : 'CON'
      field.push(
        nace(
          `${worldSeed}:${id}`,
          division,
          neoproAge(seededRng(`${worldSeed}:${id}:edad`)),
          season,
        ),
      )
    }
    filas.push(foto(season, field, retired, neopros))
  }
  return filas
}

/**
 * 3) EL ARCO DEL HUMANO: ¿en cuánto tiempo llega a algún sitio un jugador que empieza de cero?
 *
 * Es la tercera pregunta del dueño y la que menos se puede contestar mirando al pelotón, porque el
 * humano NO nace como un bot: `generateRiderGenome` le da techos con sesgo por vocación y valores
 * iniciales bajos, y desde ahí sube entrenando y corriendo. Los dos extremos son defectos y los dos
 * se ven aquí: el arco demasiado LENTO —nadie le ficha nunca, el juego no engancha— y el demasiado
 * RÁPIDO —a los 25 es el mejor del mundo con el plan por defecto, y entonces las decisiones del
 * jugador no valían nada—.
 *
 * Nace a los 18, entrena con el plan del bot y corre 45 días de continental al año, que es lo que
 * hace un neoprofesional de verdad. Se le mira a los 20, 22 y 25.
 *
 * VA POR VOCACIÓN Y NO POR ARQUETIPO, y hay que decirlo: el diseño pide los ocho arquetipos, pero la
 * génesis que los reparte es del paso 5 y hoy `generateRiderGenome` solo entiende las cinco
 * vocaciones. Medir «por arquetipo» antes de que el arquetipo exista sería inventarse tres columnas.
 * Cuando llegue el paso 5 esta función pasa a ocho sin cambiar de forma.
 */
export interface ArcoHumano {
  vocation: Vocation
  /** Media de atributos físicos a cada edad, y su mejor especialidad al final. */
  a20: number
  a22: number
  a25: number
  cartaA25: number
}

export interface ArcoHumanoStats {
  arcos: ArcoHumano[]
  /** Las dos referencias contra las que se leen: el suelo del continental y el techo del WT. */
  p25ConA22: number
  p90WtA25: number
}

/** Días de carrera al año de un humano que empieza: menos que un profesional hecho. */
const DIAS_DE_CARRERA_HUMANO = 45

export function arcoHumano(worldSeed: string): ArcoHumanoStats {
  const cal = CALENDARIO.CON
  const arcos: ArcoHumano[] = []
  for (const vocation of VOCATIONS) {
    const g = generateRiderGenome(`${worldSeed}:humano:${vocation}`, vocation)
    const r = seededRng(`${worldSeed}:humano:${vocation}:forma`)
    const h: WorldRider = {
      riderId: `humano-${vocation}`,
      division: 'CON',
      vocation,
      age: 18,
      attributes: { ...g.attributes },
      ceilings: { ...g.hidden.ceilings },
      talent: g.hidden.talent,
      fragility: g.hidden.fragility,
      peakAge: g.hidden.peakAge,
      declineAge: g.hidden.declineAge,
      ctl: 35 + 15 * r(),
      atl: 30 + 10 * r(),
      morale: 55 + 20 * r(),
      health: 'sano',
      healthUntilDay: null,
      debutSeason: 0,
      movidoElDia: new Map(),
      temporada: nuevaTemporada(g.attributes),
    }
    const hito = new Map<number, number>()
    for (let temporada = 0; temporada < 8; temporada++) {
      const dias = new Map<number, DiaDeCarrera>()
      const rr = seededRng(`${worldSeed}:humano:${vocation}:cal:${temporada}`)
      for (let i = 0; i < DIAS_DE_CARRERA_HUMANO; i++) {
        dias.set(Math.floor(rr() * DAYS_PER_SEASON), cal[Math.floor(rr() * cal.length)]!)
      }
      for (let dia = 0; dia < DAYS_PER_SEASON; dia++) {
        const gameDay = temporada * DAYS_PER_SEASON + dia
        const hoy = dias.get(dia)
        if (hoy !== undefined) {
          const sube = raceLearning({
            raceClass: hoy.raceClass as never,
            kind: hoy.kind,
            attributes: h.attributes,
            ceilings: h.ceilings,
          })
          for (const [attr, delta] of Object.entries(sube)) {
            const a = attr as Attribute
            h.attributes[a] = Math.min(h.ceilings[a], h.attributes[a] + (delta ?? 0))
          }
          const carga = applyDailyLoad({ ctl: h.ctl, atl: h.atl }, hoy.tss, h.attributes.REC)
          h.ctl = carga.ctl
          h.atl = carga.atl
          continue
        }
        const out = simulateRiderDay(
          {
            attributes: h.attributes,
            ctl: h.ctl,
            atl: h.atl,
            morale: h.morale,
            health: h.health,
            healthUntilDay: h.healthUntilDay,
          },
          {
            gameDay,
            age: h.age,
            ceilings: h.ceilings,
            talent: h.talent,
            fragility: h.fragility,
            peakAge: h.peakAge,
            declineAge: h.declineAge,
            choice: defaultCoachPlan(gameDay, h.vocation),
            kInst: 1,
            kStaff: 1,
            rng: seededRng(`${worldSeed}:humano:${vocation}:${gameDay}`),
          },
        )
        h.attributes = out.state.attributes
        h.ctl = out.state.ctl
        h.atl = out.state.atl
        h.morale = out.state.morale
        h.health = out.state.health
        h.healthUntilDay = out.state.healthUntilDay
      }
      h.age += 1
      if (h.age === 20 || h.age === 22 || h.age === 25) {
        hito.set(h.age, media(FISICOS.map((a) => h.attributes[a])))
      }
    }
    arcos.push({
      vocation,
      a20: hito.get(20) ?? 0,
      a22: hito.get(22) ?? 0,
      a25: hito.get(25) ?? 0,
      cartaA25: cartaDe(h),
    })
  }

  /**
   * LAS REFERENCIAS, y de dónde salen exactamente. Son una muestra de bots RECIÉN GENERADOS a esa
   * edad, no del pelotón del banco después de correr veinte temporadas. Es la comparación honesta
   * para esta pregunta —«¿está este humano a la altura de un continental de 22?»— y además la única
   * estable: la del banco depende de cuántas temporadas lleve corriendo.
   */
  const muestra = (division: Division, age: number, n: number): number[] => {
    const out: number[] = []
    for (let i = 0; i < n; i++) {
      const voc = VOCATIONS[i % VOCATIONS.length]!
      const g = generateNpcRider(`${worldSeed}:ref:${division}:${age}:${i}`, {
        division,
        vocation: voc,
        age,
      })
      out.push(media(FISICOS.map((a) => g.attributes[a])))
    }
    return out
  }
  return {
    arcos,
    p25ConA22: cuantil(muestra('CON', 22, 400), 0.25),
    p90WtA25: cuantil(muestra('WT', 25, 400), 0.9),
  }
}

/** Varias corridas del mundo, promediadas temporada a temporada: una sola oscila demasiado. */
export function analyzeWorld(
  runs: number,
  seasons: number,
  opciones: WorldOptions = {},
): WorldSeasonRow[] {
  const todas: WorldSeasonRow[][] = []
  for (let i = 0; i < runs; i++) todas.push(runWorld(`mundo-${i}`, seasons, opciones))
  const out: WorldSeasonRow[] = []
  for (let s = 0; s < seasons; s++) {
    const fila = todas.map((t) => t[s]!)
    out.push({
      season: s + 1,
      riders: media(fila.map((f) => f.riders)),
      retired: media(fila.map((f) => f.retired)),
      neopros: media(fila.map((f) => f.neopros)),
      estrellas5Medias: media(fila.map((f) => f.estrellas5Medias)),
      estrellas5Mejor: media(fila.map((f) => f.estrellas5Mejor)),
      cracksPct: media(fila.map((f) => f.cracksPct)),
      sinNadaSobre4Pct: media(fila.map((f) => f.sinNadaSobre4Pct)),
      mediaGlobal: media(fila.map((f) => f.mediaGlobal)),
      mejor: media(fila.map((f) => f.mejor)),
      mediana: media(fila.map((f) => f.mediana)),
      anchoP90P10: media(fila.map((f) => f.anchoP90P10)),
      margenAlTechoPct: media(fila.map((f) => f.margenAlTechoPct)),
      congeladosPct: media(fila.map((f) => f.congeladosPct)),
      edadMedia: media(fila.map((f) => f.edadMedia)),

      cincoEstrellasWTPct: media(fila.map((f) => f.cincoEstrellasWTPct)),
      cincoEstrellasWTMadurosPct: media(fila.map((f) => f.cincoEstrellasWTMadurosPct)),
      sinNadaSobre4WTPct: media(fila.map((f) => f.sinNadaSobre4WTPct)),
      sinNadaSobre4NoGregariosWTPct: media(fila.map((f) => f.sinNadaSobre4NoGregariosWTPct)),
      arquetiposPct: Object.fromEntries(
        RIDER_ARCHETYPES.map((a) => [a, media(fila.map((f) => f.arquetiposPct[a]))]),
      ) as Record<RiderArchetype, number>,
      purosVelocistasPct: media(fila.map((f) => f.purosVelocistasPct)),
      purosEscaladoresPct: media(fila.map((f) => f.purosEscaladoresPct)),
      // Es 0 o 100 en cada mundo: promediarlos da el % de mundos en que los tres mejores están en
      // su casa, que es justo lo que la fila quiere decir.
      mejorPorArquetipoOk: media(fila.map((f) => f.mejorPorArquetipoOk)),
      margenMotorPct: media(fila.map((f) => f.margenMotorPct)),
      margenOficioPct: media(fila.map((f) => f.margenOficioPct)),
      margenJovenesPct: media(fila.map((f) => f.margenJovenesPct)),
      margenMediosPct: media(fila.map((f) => f.margenMediosPct)),
      margenVeteranosPct: media(fila.map((f) => f.margenVeteranosPct)),
      jovenesConMargenPct: media(fila.map((f) => f.jovenesConMargenPct)),
      crecimientoNeoproWT: media(fila.map((f) => f.crecimientoNeoproWT)),
      techosNeoprosVsGen0: Object.fromEntries(
        (['WT', 'PRS', 'CON'] as Division[]).map((d) => {
          const vivos = fila.map((f) => f.techosNeoprosVsGen0[d]).filter((x) => x !== null)
          return [d, vivos.length === 0 ? null : media(vivos)]
        }),
      ) as Record<Division, number | null>,
      curvaEdadAerobicaJoven: media(fila.map((f) => f.curvaEdadAerobicaJoven)),
      curvaEdadAerobicaVeterana: media(fila.map((f) => f.curvaEdadAerobicaVeterana)),
      curvaEdadNeuroJoven: media(fila.map((f) => f.curvaEdadNeuroJoven)),
      curvaEdadNeuroVeterana: media(fila.map((f) => f.curvaEdadNeuroVeterana)),
      curvaEdadTAC: media(fila.map((f) => f.curvaEdadTAC)),
      vets34vs28: media(fila.map((f) => f.vets34vs28)),
      congeladosJovenesPct: media(fila.map((f) => f.congeladosJovenesPct)),
      aprendidoJovenes: media(fila.map((f) => f.aprendidoJovenes)),
      aprendidoMedios: media(fila.map((f) => f.aprendidoMedios)),
      aprendidoVeteranos: media(fila.map((f) => f.aprendidoVeteranos)),
      enfermedadesAno: media(fila.map((f) => f.enfermedadesAno)),
      diasMolestiasAno: media(fila.map((f) => f.diasMolestiasAno)),
      ganaRESporAno: media(fila.map((f) => f.ganaRESporAno)),
      ganaTACporAno: media(fila.map((f) => f.ganaTACporAno)),
    })
  }
  return out
}
