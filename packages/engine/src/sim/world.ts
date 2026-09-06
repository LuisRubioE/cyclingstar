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
  type Attribute,
  DAYS_PER_SEASON,
  VOCATIONS,
  type Vocation,
  attrStars,
  defaultCoachPlan,
  seededRng,
} from '@cyclingstar/shared'
import { applyDailyLoad } from '../banister.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { simulateRiderDay } from '../progression.js'
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
}

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
 * CUÁNTO CUESTA UN DÍA DE CARRERA, por terreno. El banco no simula la etapa —eso son 442 corredores
 * por 364 días por 25 temporadas y no terminaría nunca—, así que la carga es representativa y no
 * medida corredor a corredor. Es la aproximación que este banco ASUME, y hay que decirlo: lo que
 * mide bien es CUÁNTO SE APRENDE compitiendo, que es lo que pide G1; lo que no mide es quién gana.
 */
const TSS_POR_TERRENO: Record<string, number> = {
  llana: 110,
  media: 145,
  reina: 185,
  cri: 95,
  clasica: 160,
}

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
        tss: TSS_POR_TERRENO[st.kind] ?? 130,
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
  const cincos = field.map((r) => FISICOS.filter((a) => attrStars(r.attributes[a]) >= 5).length)
  const cracks = cincos.filter((n) => n >= 3).length
  const medianias = field.filter((r) => FISICOS.every((a) => attrStars(r.attributes[a]) < 4)).length
  const margen = field.flatMap((r) =>
    FISICOS.map((a) => Math.max(0, r.ceilings[a] - r.attributes[a])),
  )
  const techos = field.flatMap((r) => FISICOS.map((a) => r.ceilings[a]))
  const congelados = field.filter((r) =>
    FISICOS.every((a) => r.attributes[a] >= r.ceilings[a]),
  ).length
  return {
    season,
    riders: field.length,
    retired,
    neopros,
    estrellas5Medias: media(cincos),
    estrellas5Mejor: Math.max(...cincos),
    cracksPct: (100 * cracks) / Math.max(1, field.length),
    sinNadaSobre4Pct: (100 * medianias) / Math.max(1, field.length),
    mediaGlobal: media(medias),
    mejor: Math.max(...medias),
    mediana: cuantil(medias, 0.5),
    anchoP90P10: cuantil(medias, 0.9) - cuantil(medias, 0.1),
    margenAlTechoPct: (100 * media(margen)) / Math.max(1, media(techos)),
    congeladosPct: (100 * congelados) / Math.max(1, field.length),
    edadMedia: media(field.map((r) => r.age)),
  }
}

/**
 * Corre un mundo durante `seasons` temporadas y devuelve la foto de cada una.
 *
 * El día a día es el del tick de producción reducido a lo que cambia a un corredor cuando NO corre:
 * el plan del entrenador bot (`defaultCoachPlan`, el mismo que usa `packages/db`), `simulateRiderDay`
 * y nada más. `kInst` y `kStaff` van a 1 —sin instalaciones ni staff que multipliquen— porque este
 * banco mide el MOTOR de progresión, no la economía de un equipo.
 */
export function runWorld(worldSeed: string, seasons: number): WorldSeasonRow[] {
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
    const corre = new Map<string, Map<number, DiaDeCarrera>>()
    for (const r of field) {
      const cal = CALENDARIO[r.division]
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
            r.attributes[a] = Math.min(r.ceilings[a], r.attributes[a] + (delta ?? 0))
          }
          const carga = applyDailyLoad({ ctl: r.ctl, atl: r.atl }, hoy.tss, r.attributes.REC)
          r.ctl = carga.ctl
          r.atl = carga.atl
          continue
        }
        // El plan del entrenador mira la VOCACIÓN desde la v53, así que el banco también: si le
        // diera a todos la semana del completo mediría un mundo que el juego ya no corre.
        const choice = defaultCoachPlan(gameDay, r.vocation)
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
            rng: seededRng(`${worldSeed}:${r.riderId}:${gameDay}`),
          },
        )
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

/** Varias corridas del mundo, promediadas temporada a temporada: una sola oscila demasiado. */
export function analyzeWorld(runs: number, seasons: number): WorldSeasonRow[] {
  const todas: WorldSeasonRow[][] = []
  for (let i = 0; i < runs; i++) todas.push(runWorld(`mundo-${i}`, seasons))
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
    })
  }
  return out
}
