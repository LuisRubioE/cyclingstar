/**
 * EL BANCO DE LA GENERAL, QUE NO EXISTÍA (v79).
 *
 * **NINGÚN BANCO DE ESTE REPOSITORIO PASA CONTEXTO DE CARRERA.** Ni `grandTour`, ni `smallTours`,
 * ni los escenarios canónicos mandan `race`, y los escenarios canónicos son además carreras de UN
 * DÍA: todos llegan con `gcDeficitSeconds` = 0, así que `hasGcContext` sale `false` y **no hay
 * maillot ni general que defender**.
 *
 * La consecuencia se ha cobrado cuatro veces en una sola sesión, y por eso este banco existe:
 *
 *  - **v75** (la etapa 1 de una vuelta tiene general), **v77** (la etapa 3 no se corre como la 18) y
 *    **v79** (el maillot no se va en la fuga del día) entraron en producción **sin que ningún banco
 *    pudiera verlas**. Lo que las sujeta son pruebas de unidad y medidas a mano.
 *  - `gcClimbRecoverPerKm` se declaró «imposible de calibrar» porque su capa está apagada.
 *  - Y la capa `director` sale **idéntica a producción** en los bancos canónicos, no porque sea
 *    inocua sino porque su mitad principal (`sangreDelLider`) devuelve 1 de inmediato `if
 *    (!hasGcContext)`. El banco no la puede ver.
 *
 * Aquí se corre el motor **con una general de verdad**: un líder, un pelotón escalonado detrás, y el
 * día de carrera puesto. Cada estadística vigila una regla que hoy no vigila nadie.
 */
import { flatScenario, queenScenario, campaignSeeds } from './scenarios.js'
import { raceRadioCollector, radioKmPoints } from './raceRadio.js'
import { teamedField } from './tactics.js'
import { simulateStage } from '../stage/simulate.js'
import type { SnapshotRider, StageInput, StageProfile, StageRider } from '../stage/types.js'
import type { RaceShape } from '../stage/views.js'

export interface GeneralStats {
  runs: number
  /**
   * % de etapas LLANAS en que el maillot acaba en el grupo de cabeza. En carretera esto es noticia
   * de portada, no una tarde cualquiera (R02.12). Medido antes de la v79: **12,5 %**.
   */
  jerseyFrontFlatPct: number
  /**
   * …Y EN LA REINA, que NO tiene que ser cero: allí el maillot ataca, responde y a veces se va. Un
   * cero aquí significaría que el freno se pasó de frenada, que es el defecto contrario.
   */
  jerseyFrontQueenPct: number
  /**
   * EQUIPOS DE GENERAL QUE TIRAN por etapa en la etapa 3 de 21, sobre un campo de MONTAÑA —que es
   * donde hay equipos con motivo de general—. El dueño: «no veo que alguien que quizás acabe
   * luchando por el podio tenga que desgastar a su equipo por una fuga en la etapa 3 que saca solo
   * 1 minuto» (R04, v77).
   */
  gcPullTeamsEarly: number
  /** …y los mismos, con la misma fuga y las mismas semillas, en la etapa 18. Tiene que ser MÁS. */
  gcPullTeamsLate: number
  /**
   * EL DEPÓSITO DEL MAILLOT AL PIE DEL PUERTO DECISIVO, en fracción del tanque con el que salió.
   *
   * Es el dato que le falta a R13.1 —«el día que el maillot cede, sus rivales atacan más»— y el que
   * enseñó por qué esa regla no podía cumplirse hasta la v80: el listón absoluto valía 0,45 y esta
   * distribución vive POR ENCIMA, así que lo que disparaba la regla era el error de lectura. La v80
   * lo sustituye por una comparación relativa (`bloodMargin`). Ver docs/balance.md v79 y v80.
   */
  jerseyTankAtDecisive: { p05: number; p50: number; belowBloodPct: number }
  /**
   * ————— LA TREGUA, QUE ES EL ESTADÍSTICO QUE EL DISEÑO PEDÍA Y NO EXISTÍA (v82) —————
   *
   * `ambushGainShare` llevaba marcado «[calibrar] contra `truceGrantedPct` 50-85 %» desde que nació,
   * y el paso 21 comprobó que **`truceGrantedPct` no estaba en el repositorio**: cero apariciones en
   * `targets.ts` y en `analyze.ts`, y la propia tabla de `tactica.md` lo listaba con la columna «no
   * existe». Aquí se construye, y aquí es el único sitio donde puede vivir: la emboscada exige
   * equipos con jefe de GENERAL y `gcDeficitSeconds` de verdad, y este es el único banco que los
   * tiene. Medido en el barrido del paso 21, con los bancos de un día `ambushGainShare` salía
   * **idéntica dígito a dígito** en 0,30, 0,50 y 0,70 sobre las diez estadísticas: no es que no
   * decidiera, es que en una carrera de un día ese camino no se recorre nunca.
   */
  truceAskedPerStage: number
  truceGrantedPct: number
  /**
   * ————— Y LA CORREA, POR EL MISMO MOTIVO (v82) —————
   *
   * `gcClimbRecoverPerKm` solo decide a través de `recoverableSeconds(shape)`, y `shape` sale de
   * `race.shape` —lo que QUEDA DE CARRERA, no de etapa—. En producción lo rellena
   * `packages/db/src/raceContext.ts`; **ningún banco lo pasaba**, así que la constante multiplicaba
   * un cero en todos ellos. Por eso salía inerte dígito a dígito en el barrido.
   *
   * Aquí se pasa una forma declarada —la que queda desde la etapa 15 de una gran vuelta de tres
   * semanas— y se mide lo que la correa gobierna: **cuánto colchón llega a tener la fuga del día**,
   * que es literalmente lo que un director concede según con qué terreno puede recuperarlo.
   */
  breakMaxGapS: number
  /**
   * ————— CUÁNTA GENTE PONE AL FRENTE EL EQUIPO DEL MAILLOT EN UNA REINA (v84) —————
   *
   * % de kilómetros del pelotón en los que el equipo del maillot tiene **cinco o más hombres**
   * dando la cara. El dueño lo vio en producción, etapa 19: «el maillot amarillo tiene 9 minutos de
   * ventaja sobre el segundo, los escapados están a 33 y 41 minutos en la general… ¿qué necesidad
   * hay de que el equipo del líder tire tan fuerte?». Siete de ocho hombres durante cuarenta
   * kilómetros. Y en las etapas 13, 15 y 18 del mismo Tour: 62 %, 63 % y 68 % de los kilómetros.
   *
   * **SE MIDE SOBRE UN CAMPO CON FORMA DE PRODUCCIÓN (22 equipos de 8) Y NO SOBRE EL DE ESTE
   * BANCO**, y no es un capricho: con los 8 equipos de 5 que usa el resto de `analyzeGeneral` es
   * IMPOSIBLE que haya siete hombres de una casa al frente, así que la sonda medía cero y no podía
   * ver lo que dice medir. Es el mismo error que este fichero lleva dos versiones cazando —un
   * instrumento ciego devuelve un cero tranquilizador— y esta vez lo cometí al montarla.
   */
  jerseyFrontHeavyPct: number
}

/**
 * Un campo con general de verdad: un líder, y el resto escalonado detrás.
 *
 * SE EXPORTA para que el invariante pueda comprobar que el campo de este banco lleva general de
 * verdad. Sin eso, `hasGcContext` saldría `false`, el banco mediría el motor SIN maillot y las dos
 * estadísticas de arriba pasarían en verde sin enterarse de nada.
 */
export function conGeneral(riders: readonly StageRider[], huecoS: number): StageRider[] {
  return riders.map((r, i) => ({
    ...r,
    gcDeficitSeconds: i === 0 ? 0 : Math.min(i, 40) * huecoS,
    gcRank: i + 1,
  }))
}

function corre(
  profile: StageProfile,
  riders: StageRider[],
  seed: string,
  race?: StageInput['race'],
) {
  return simulateStage({ profile, riders, ...(race ? { race } : {}) }, seed)
}

/**
 * LA FORMA DE LA CARRERA QUE QUEDA, DECLARADA (v82). Es lo que `packages/db/raceContext.ts` calcula
 * en producción a partir del calendario y lo que ningún banco pasaba, con la consecuencia de que
 * `gcClimbRecoverPerKm` multiplicaba un cero en todos ellos.
 *
 * Los números son de una gran vuelta de tres semanas vista desde su etapa 15: quedan siete días, y
 * en ellos **120 km de puerto, una crono de 30 y cinco etapas en línea**. No salen de ningún banco
 * porque no hay ninguno que los mida: salen de mirar la última semana de un calendario de tres
 * semanas, y se dicen aquí para que el que los cambie sepa qué está cambiando.
 */
function formaDeLaCarrera(profile: StageProfile, climbKmLeft: number): RaceShape {
  const totalKm = profile.segments.reduce((a, g) => a + g.km, 0)
  return {
    totalKm,
    kmDone: 0,
    nextClimbKm: null,
    lastClimbKm: null,
    valleyAfterLastClimbKm: null,
    daysLeft: 7,
    raceClimbKmLeft: climbKmLeft,
    raceTtKmLeft: 30,
    raceLineStagesLeft: 5,
  }
}

/**
 * LA TREGUA, CONTADA: cuántas se piden por etapa y qué fracción se concede. Es `truceGrantedPct`,
 * el estadístico que `ambushGainShare` citaba como ancla y que no existía.
 */
function tregua(
  perfil: StageProfile,
  campo: readonly StageRider[],
  runs: number,
): { asked: number; grantedPct: number } {
  let pedidas = 0
  let concedidas = 0
  for (const seed of campaignSeeds('general-tregua', runs)) {
    const out = simulateStage(
      {
        profile: perfil,
        riders: [...campo],
        race: { stageDay: 15, totalStages: 21, shape: formaDeLaCarrera(perfil, 120) },
      },
      seed,
    )
    for (const e of out.events) {
      if (e.plantilla === 'truce_granted') {
        pedidas += 1
        concedidas += 1
      } else if (e.plantilla === 'truce_denied') {
        pedidas += 1
      }
    }
  }
  return {
    asked: runs === 0 ? 0 : pedidas / runs,
    grantedPct: pedidas === 0 ? 0 : (100 * concedidas) / pedidas,
  }
}

/**
 * EL COLCHÓN MÁXIMO DE LA FUGA DEL DÍA, que es lo que la correa gobierna: un director concede
 * según con qué terreno puede recuperar lo concedido (`recoverableSeconds`), y eso se ve en cuánto
 * llega a irse la fuga. Mediana sobre las semillas, con la forma de la carrera puesta.
 */
function colchonDeLaFuga(
  perfil: StageProfile,
  campo: readonly StageRider[],
  runs: number,
  climbKmLeft: number,
): number {
  const huecos: number[] = []
  for (const seed of campaignSeeds('general-correa', runs)) {
    const out = simulateStage(
      {
        profile: perfil,
        riders: [...campo],
        race: { stageDay: 15, totalStages: 21, shape: formaDeLaCarrera(perfil, climbKmLeft) },
      },
      seed,
    )
    let mx = 0
    for (const e of out.events) {
      const g = Number(e.datos?.gapS ?? 0)
      if (Number.isFinite(g) && g > mx) mx = g
    }
    huecos.push(mx)
  }
  if (huecos.length === 0) return 0
  huecos.sort((a, b) => a - b)
  return huecos[Math.floor(huecos.length / 2)]!
}

/** ¿Sale el maillot nombrado en el grupo de cabeza en algún momento de la etapa? */
function maillotDelante(out: ReturnType<typeof simulateStage>, maillot: string): boolean {
  return out.events.some(
    (e) => (e.tipo === 'cabeza' || e.tipo === 'fuga_formada') && e.protagonistas.includes(maillot),
  )
}

/**
 * Cuántos EQUIPOS distintos tiran del pelotón declarando motivo de general.
 *
 * El evento no lleva la casa —lleva `porQue` y los protagonistas— así que se deriva de ellos, igual
 * que `analyzeTeamVoice`. Y `porQue` solo se escribe cuando los que tiran son TODOS del mismo
 * equipo, que es justo el caso que aquí se cuenta: una alianza no tiene un motivo único.
 */
function equiposTirandoPorLaGeneral(
  out: ReturnType<typeof simulateStage>,
  teamOf: ReadonlyMap<string, string>,
): number {
  const casas = new Set<string>()
  for (const e of out.events) {
    if (e.plantilla !== 'peloton_pull') continue
    if (String(e.datos?.porQue ?? '') !== 'general') continue
    const equipos = new Set(e.protagonistas.map((id) => teamOf.get(id) ?? ''))
    if (equipos.size === 1) {
      const casa = [...equipos][0]!
      if (casa !== '') casas.add(casa)
    }
  }
  return casas.size
}

/**
 * EL PIE DEL ÚLTIMO PUERTO, que es donde alguien le mira la cara al líder.
 *
 * `Segment` NO lleva su kilómetro de inicio —solo su LONGITUD—, así que hay que acumularlo. Dicho
 * porque la primera versión de esta medida leía un `desdeKm` que no existe: `pieKm` salía `NaN`, la
 * sonda no disparó ni una vez en sesenta semillas y la muestra quedó vacía. Un instrumento que no
 * dispara no devuelve un error, devuelve un cero tranquilizador.
 */
function pieDelUltimoPuerto(perfil: StageProfile): number {
  let acumulado = 0
  let pie: number | null = null
  for (const s of perfil.segments) {
    // `'puerto'` es el ÚNICO terreno de subida que existe en un `Segment`: `'subida'` es terreno de
    // BLOQUE (`BlockTerrain`), del otro lado del muestreo, y buscarlo aquí es una rama muerta.
    if (s.tipo === 'puerto') pie = acumulado
    acumulado += s.km
  }
  return pie ?? acumulado * 0.7
}

/**
 * LA FRACCIÓN DE TANQUE DEL MAILLOT AL PIE DEL PUERTO DECISIVO, sobre `runs` semillas.
 *
 * Se mide con la capa `director` APAGADA a propósito: la pregunta es qué estado produce el motor,
 * no qué produce la capa que va a leer ese estado.
 */
function tanqueDelMaillot(
  perfil: StageProfile,
  campo: readonly StageRider[],
  maillot: string,
  runs: number,
): { p05: number; p50: number; belowBloodPct: number } {
  const pieKm = pieDelUltimoPuerto(perfil)
  const fracciones: number[] = []
  for (const seed of campaignSeeds('general-tanque', runs)) {
    let foto: readonly SnapshotRider[] = []
    simulateStage(
      { profile: perfil, riders: [...campo], race: { stageDay: 15, totalStages: 21 } },
      seed,
      {
        atKm: [pieKm],
        onSnapshot: (_km, rs) => {
          foto = rs
        },
      },
    )
    const l = foto.find((r) => r.riderId === maillot)
    if (l != null && l.energy0 > 0) fracciones.push(l.energy / l.energy0)
  }
  if (fracciones.length === 0) return { p05: 0, p50: 0, belowBloodPct: 0 }
  fracciones.sort((a, b) => a - b)
  const en = (q: number): number =>
    Math.round(
      1000 * fracciones[Math.min(fracciones.length - 1, Math.floor(q * fracciones.length))]!,
    ) / 1000
  // El 0,45 va ESCRITO y no leído de la constante: la constante ya no existe —la v80 la sustituyó
  // por `bloodMargin`— y lo que este número documenta es el listón CONTRA EL QUE SE MIDIÓ, que es un
  // dato histórico. Leerlo de `STAGE` haría que la cifra cambiase de significado sin avisar.
  const bajo = fracciones.filter((f) => f < 0.45).length
  return {
    p05: en(0.05),
    p50: en(0.5),
    belowBloodPct: Math.round((1000 * bajo) / fracciones.length) / 10,
  }
}

/**
 * CUÁNTOS HOMBRES PONE AL FRENTE EL EQUIPO DEL MAILLOT, kilómetro a kilómetro (v84).
 *
 * Se lee de la RADIO y no de los partes de relevo porque el parte nombra como mucho a tres: la
 * pregunta es cuántos hay, no a quién se nombra. Y el motivo `equipo_maillot` vale como cuenta por
 * equipo sin más filtro porque **equipo del maillot no hay más que uno**; contar por motivo sería
 * un error para cualquier otro —`equipo_etapa` suma varias casas de velocista a la vez, y de hecho
 * me lo tragué una vez: salía 20 con cupo y sin él porque 20 es el techo global, no lo de una casa—.
 */
function maillotAlFrente(perfil: StageProfile, campo: readonly StageRider[], runs: number): number {
  let fotos = 0
  let pesadas = 0
  const totalKm = perfil.segments.reduce((a, s) => a + s.km, 0)
  for (const seed of campaignSeeds('general-maillot-frente', runs)) {
    const { probe, radio } = raceRadioCollector(radioKmPoints(totalKm, 1))
    simulateStage(
      { profile: perfil, riders: [...campo], race: { stageDay: 15, totalStages: 21 } },
      seed,
      probe,
    )
    for (const k of radio().kms) {
      const pel = k.groups.find((g) => g.id === 'peloton')
      if (pel === undefined || pel.pulling.length === 0) continue
      fotos += 1
      if (pel.pulling.filter((x) => x.motivo === 'equipo_maillot').length >= 5) pesadas += 1
    }
  }
  return fotos === 0 ? 0 : Math.round((1000 * pesadas) / fotos) / 10
}

/**
 * `conParejas` corre además el pareado etapa 3 / etapa 18, que son DOS reinas por semilla y es lo
 * caro de este banco. El invariante de CI lo deja fuera a propósito y solo lo corre `pnpm sim`: su
 * diferencia no es significativa a estas semillas (ver `gcPullTeamsEarly`), así que pagar reinas en
 * cada CI por un número que no puede fallar sería pagar por nada.
 */
export function analyzeGeneral(runs: number, conParejas = true): GeneralStats {
  const flat = flatScenario()
  const queen = queenScenario()
  const base = teamedField({ teams: 8, per: 5, kind: 'llana', strong: 4 })
  const campo = conGeneral(base, 25)
  const maillot = campo[0]!.riderId

  let frenteLlana = 0
  let frenteReina = 0
  for (const seed of campaignSeeds('general-llana', runs)) {
    if (maillotDelante(corre(flat.input.profile, campo, seed), maillot)) frenteLlana += 1
  }
  for (const seed of campaignSeeds('general-reina', runs)) {
    if (maillotDelante(corre(queen.input.profile, campo, seed), maillot)) frenteReina += 1
  }

  /**
   * LA ETAPA 3 CONTRA LA 18, pareado: mismo campo, mismas semillas, misma fuga. Lo ÚNICO que cambia
   * es el día de carrera, así que la diferencia que salga es de eso y de nada más.
   *
   * **Y SOBRE UN CAMPO DE MONTAÑA, QUE ES LO QUE ESTA PREGUNTA NECESITA.** La primera versión de
   * este banco lo medía sobre el campo de llano y daba **cero en los dos brazos**: en un campo
   * orientado al esprint los jefes son velocistas, así que ningún equipo tiene motivo de GENERAL y
   * la estadística no podía distinguir nada. Diagnosticado, no supuesto: 76 partes de relevo,
   * motivos `maillot` 26 y `etapa` 25, **`general` cero**. Con campo de reina aparecen.
   *
   * Es el mismo error que este documento lleva todo el día cazando —un instrumento que no puede ver
   * lo que dice medir— y esta vez el instrumento era mío.
   */
  const gcCampo = conGeneral(teamedField({ teams: 8, per: 5, kind: 'reina', strong: 4 }), 25)
  const teamOf = new Map(gcCampo.map((r) => [r.riderId, r.teamId ?? r.riderId]))
  const parejas = conParejas ? runs : 0
  let temprano = 0
  let tarde = 0
  for (const seed of conParejas ? campaignSeeds('general-dia', runs) : []) {
    temprano += equiposTirandoPorLaGeneral(
      corre(queen.input.profile, gcCampo, seed, { stageDay: 3, totalStages: 21 }),
      teamOf,
    )
    tarde += equiposTirandoPorLaGeneral(
      corre(queen.input.profile, gcCampo, seed, { stageDay: 18, totalStages: 21 }),
      teamOf,
    )
  }

  /**
   * LA TREGUA CORRE SIEMPRE LA MUESTRA ENTERA, y es la excepción al «diez en CI» de este banco. El
   * motivo es que aquí el suceso es RARO —se pide en el 25 % de las reinas— así que recortar la
   * muestra no abarata una medida: la borra. Con diez semillas salen dos o tres treguas y un
   * porcentaje sobre tres casos no es un porcentaje.
   */
  const laTregua = tregua(queen.input.profile, gcCampo, runs)

  return {
    runs,
    /**
     * DIEZ SEMILLAS EN CI Y LA MUESTRA ENTERA EN `pnpm sim`, y no es una excepción caprichosa: lo
     * que la CI comprueba de este número es que la sonda DISPARE, y eso lo prueban diez reinas igual
     * que sesenta. Los percentiles, que sí necesitan muestra, los imprime `pnpm sim`. Cobrarle a
     * cada push cuarenta reinas por una comprobación de existencia sería justo lo que este banco
     * decidió no hacer con el pareado etapa 3 / etapa 18.
     */
    jerseyTankAtDecisive: tanqueDelMaillot(
      queen.input.profile,
      gcCampo,
      gcCampo[0]!.riderId,
      conParejas ? runs : Math.min(runs, 10),
    ),
    truceAskedPerStage: laTregua.asked,
    truceGrantedPct: laTregua.grantedPct,
    breakMaxGapS: colchonDeLaFuga(
      queen.input.profile,
      gcCampo,
      conParejas ? runs : Math.min(runs, 10),
      120,
    ),
    /**
     * CAMPO DE PRODUCCIÓN Y MUESTRA CORTA: lo caro aquí son los 176 corredores, no las semillas, y
     * lo que la CI comprueba es que el número esté en su sitio, no su tercer decimal.
     */
    jerseyFrontHeavyPct: maillotAlFrente(
      queen.input.profile,
      conGeneral(teamedField({ teams: 22, per: 8, kind: 'reina', strong: 6 }), 25),
      conParejas ? Math.min(runs, 20) : Math.min(runs, 6),
    ),
    jerseyFrontFlatPct: (100 * frenteLlana) / runs,
    jerseyFrontQueenPct: (100 * frenteReina) / runs,
    gcPullTeamsEarly: parejas === 0 ? 0 : temprano / parejas,
    gcPullTeamsLate: parejas === 0 ? 0 : tarde / parejas,
  }
}
