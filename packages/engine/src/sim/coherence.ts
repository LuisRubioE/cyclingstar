/**
 * LA AUDITORÍA DE COHERENCIA DE LA CRÓNICA (v25, docs/motor.md §16).
 *
 * El dueño leyó el diario de Race Jaén y dijo que «no tiene ni pies ni cabeza». La causa madre es
 * que el motor lleva DOS objetos distintos que se llaman los dos «la fuga» —`dayBreakRiders`, la
 * lista CONGELADA del momento en que se formó, y el grupo que va delante AHORA— y el relato los
 * mezcla sin saber que son dos cosas.
 *
 * Esto es el medidor. Recorre la crónica de una etapa llevando el estado (quién va delante, qué
 * movimientos están abiertos, quién lidera la montaña) y cuenta las DOCE contradicciones. No decide
 * nada de la carrera: es lectura, y por eso vive en `sim/` y no en `stage/`.
 *
 * Sirve a dos consumidores con la MISMA cuenta, que es la razón de que exista este módulo en vez de
 * un script suelto:
 *
 * - `sim/coherence.test.ts`, que la corre sobre los escenarios del banco y muchas semillas y falla
 *   si la historia se contradice (las cinco invariantes de §5 del encargo).
 * - `scripts/medir-defectos.mjs`, que la corre sobre las crónicas CONGELADAS de producción, que son
 *   las que el dueño está leyendo.
 *
 * Puro y sin dependencias del motor: la entrada es una lista de entradas de crónica ya normalizadas,
 * vengan de `StageOutput.events` (ids de corredor) o de la API (identidades resueltas).
 */

/**
 * Una entrada de crónica, reducida a lo que la auditoría necesita. `riders` son las claves con las
 * que se identifica a los protagonistas DENTRO de esta etapa: el `riderId` si viene del motor, el
 * nombre si viene de la API. Da igual cuál, mientras sea la misma en toda la etapa.
 */
export interface AuditEntry {
  km: number
  plantilla: string
  riders: readonly string[]
  datos: Readonly<Record<string, number | string>>
}

/** Las doce contradicciones, con la clave con la que se cuentan. */
export const DEFECTS = [
  'ataqueSinCerrar',
  'frenteQueCrece',
  'montanaDosVeces',
  'resumenAntesDelSuceso',
  'cazadaFantasma',
  'perseguidorDeUno',
  'frenteSinExplicar',
  'ataqueConcordancia',
  'pasajerosConcordancia',
  'parteRepetido',
  'ataqueDobleLinea',
  'numerosQueSeContradicen',
] as const

export type DefectKey = (typeof DEFECTS)[number]

/** Qué es cada defecto, en una línea. Lo imprime el medidor para que la tabla se lea sola. */
export const DEFECT_LABEL: Record<DefectKey, string> = {
  ataqueSinCerrar: 'ataques que se abren y NUNCA se cierran',
  frenteQueCrece: '«ya solo quedan N delante» con N CRECIENDO',
  montanaDosVeces: 'el maillot de montaña se gana dos veces',
  resumenAntesDelSuceso: 'el resumen va ANTES del suceso',
  cazadaFantasma: '`breakaway_caught` nombra a quien no iba delante',
  perseguidorDeUno: 'grupo perseguidor de UN corredor',
  frenteSinExplicar: 'entra o sale alguien del grupo de cabeza sin decirlo',
  ataqueConcordancia: '«…try to go with them» con UN protagonista',
  pasajerosConcordancia: '«1 of their companion sits on»',
  parteRepetido: 'el mismo equipo tira para el mismo líder sin contar nada nuevo',
  ataqueDobleLinea: 'el mismo ataque contado en dos líneas seguidas',
  numerosQueSeContradicen: 'dos números que dicen lo mismo y no coinciden',
}

/** Un hallazgo concreto, con el km en el que se lee. Sirve para explicar la cuenta. */
export interface Finding {
  defect: DefectKey
  km: number
  detail: string
}

export interface AuditResult {
  counts: Record<DefectKey, number>
  findings: Finding[]
}

const num = (e: AuditEntry, k: string): number | null =>
  e.datos[k] == null ? null : Number(e.datos[k])

/** Los eventos que ABREN un movimiento y por tanto se le deben al lector cerrar. */
const OPENING = new Set(['attack_go', 'attack_swarm'])

/**
 * Los eventos que CIERRAN el arco de un movimiento: le cazan, le reabsorben, le enganchan, le
 * dejan en tierra de nadie, le meten en la fuga del día, le sientan o le llevan a meta delante.
 */
const CLOSING = new Set([
  'attack_reeled',
  'attack_short',
  'move_faded',
  'attack_sticks',
  'move_caught',
  'move_merge',
  'bridge_made',
  'bridge_failed',
  'breakaway_formed',
  'breakaway_caught',
  'front_group',
  'rider_sits_up',
  'riders_sit_up',
  'rider_abandons',
  'riders_abandon',
  'rider_bonks',
  'riders_bonk',
  'final_km',
  'stage_win',
])

/** Los eventos por los que alguien puede APARECER legítimamente en el grupo de cabeza. */
const ENTRY = new Set([
  'breakaway_formed',
  'attack_go',
  'attack_swarm',
  'attack_sticks',
  'bridge_made',
  'move_merge',
  'peloton_split',
  'peloton_selection',
])

/**
 * Los eventos por los que alguien puede DESAPARECER del grupo de cabeza. `front_group` no está: un
 * parte de cabeza es el sitio donde se LEE el cambio, no la explicación de por qué se produjo —salvo
 * que lo diga él mismo, que es lo que `salen` añade en la v25—.
 */
const EXIT = new Set([
  'rider_sits_up',
  'riders_sit_up',
  'rider_bonks',
  'riders_bonk',
  'rider_abandons',
  'riders_abandon',
  'move_faded',
  'attack_go',
  'attack_swarm',
  'attack_sticks',
  'breakaway_caught',
  'move_caught',
  'attack_reeled',
])

/**
 * Un grupo perseguidor de UN corredor solo es un defecto si detrás hay un pelotón de verdad: en una
 * etapa que ha quedado en cuatro corredores, que el perseguidor sea uno es la carrera y no un error.
 */
const BUNCH_MIN_RIDERS = 8

/** Lo que hace CRECER al grupo de cabeza: un puente que llega, dos grupos que se juntan. */
const GROWS_THE_FRONT = new Set(['move_merge', 'bridge_made', 'attack_sticks'])

/**
 * Lo que DESPEJA LA CARRETERA. Después de esto deja de haber «grupo de cabeza» en la cabeza del
 * lector: lo siguiente que se nombre delante es un grupo que NACE, no uno del que ha desaparecido
 * gente. Es el mismo olvido que hacen el motor (`lastFrontIds`) y la crónica.
 */
const CLEARS_THE_ROAD = new Set([
  'attack_reeled',
  'move_caught',
  'breakaway_caught',
  'peloton_regroup',
  'bunch_sprint',
])

/**
 * Cuánto puede separarse la CÚSPIDE del boquete que firma `chase_work` de la mayor ventaja que la
 * crónica llegó a narrar antes de decirlo. Unos segundos son el muestreo —el boquete se mide cada
 * bloque y se narra cada veinte kilómetros—; el «peaked at 3:04» de Race Jaén contra el «2:53» que
 * el lector acaba de leer son once, y eso ya se lee como una contradicción.
 */
const PEAK_TOLERANCE_S = 5

/**
 * Audita la crónica de UNA etapa. El orden de `entries` es el que lee el jugador: la auditoría mide
 * el relato tal como se cuenta, no el estado interno del motor.
 */
export function auditStage(entries: readonly AuditEntry[]): AuditResult {
  const counts = Object.fromEntries(DEFECTS.map((d) => [d, 0])) as Record<DefectKey, number>
  const findings: Finding[] = []
  const hit = (defect: DefectKey, km: number, detail: string): void => {
    counts[defect] += 1
    findings.push({ defect, km, detail })
  }

  const lastFrontIdx = entries.reduce((mx, e, i) => (e.plantilla === 'front_group' ? i : mx), -1)
  const winner = entries.find((e) => e.plantilla === 'stage_win')
  /** ¿Vuelve a juntarse la carrera después del último parte de cabeza? Entonces nadie llegó fugado. */
  const regrouped =
    lastFrontIdx >= 0 &&
    entries
      .slice(lastFrontIdx + 1)
      .some((e) => e.plantilla === 'bunch_sprint' || e.plantilla === 'breakaway_caught')
  const arrivedInFront = new Set<string>([
    ...(winner?.riders ?? []),
    ...(!regrouped && lastFrontIdx >= 0 ? entries[lastFrontIdx]!.riders : []),
  ])
  /** El campo del que se habla: hace falta para saber si un perseguidor solo es un defecto. */
  const fieldSize = entries.reduce((mx, e) => {
    const n = num(e, 'field') ?? num(e, 'size') ?? num(e, 'chaseSize') ?? 0
    return Math.max(mx, e.plantilla === 'front_group' ? 0 : n)
  }, 0)

  // --- 1. Un movimiento que se abre tiene que cerrarse ------------------------------------------
  entries.forEach((e, i) => {
    if (!OPENING.has(e.plantilla)) return
    const closed = entries.slice(i + 1).some(
      (o) =>
        CLOSING.has(o.plantilla) &&
        // El parte de cabeza solo cierra un ataque si llega DESPUÉS: en el mismo kilómetro no es
        // el desenlace, es la misma noticia contada dos veces (ver `ataqueDobleLinea`).
        (o.plantilla !== 'front_group' || o.km > e.km) &&
        o.riders.some((r) => e.riders.includes(r)),
    )
    if (closed) return
    // …y llegar a meta DELANTE tampoco es quedarse sin cerrar. Pero solo cuenta si de verdad llegó
    // delante: el que ataca a 3 km y aparece luego en un sprint masivo de 128 fue cazado.
    if (e.riders.some((r) => arrivedInFront.has(r))) return
    hit('ataqueSinCerrar', e.km, `${e.plantilla} de ${e.riders.join(', ') || '(sin nombre)'}`)
  })

  // --- 2. «Ya solo quedan N delante» con N creciendo ---------------------------------------------
  let prevFront: AuditEntry | null = null
  for (const e of entries) {
    // Con la carretera despejada por el medio, el siguiente parte de cabeza no es el mismo grupo
    // que ha crecido: es otro grupo. Es el mismo olvido que hace el motor.
    if (CLEARS_THE_ROAD.has(e.plantilla)) {
      prevFront = null
      continue
    }
    if (e.plantilla !== 'front_group') continue
    const size = num(e, 'size') ?? e.riders.length
    const before = prevFront ? (num(prevFront, 'size') ?? prevFront.riders.length) : null
    // Con `entran` el motor ya dice que el grupo ha CRECIDO y la frase puede contarlo: el defecto es
    // anunciar una fuga que se deshace mientras se está rehaciendo.
    if (before != null && size > before && e.datos.entran == null) {
      hit('frenteQueCrece', e.km, `de ${before} a ${size} delante`)
    }
    prevFront = e
  }

  // --- 3. El maillot de montaña se gana dos veces ------------------------------------------------
  let komLeader: string | null = null
  for (const e of entries) {
    if (e.plantilla !== 'climb_kom' || num(e, 'leads') !== 1) continue
    const who = e.riders[0] ?? ''
    if (komLeader === who) hit('montanaDosVeces', e.km, `${who} pasa a liderar por segunda vez`)
    komLeader = who
  }

  // --- 4. El resumen va ANTES del suceso ----------------------------------------------------------
  const formedIdx = entries.findIndex((e) => e.plantilla === 'breakaway_formed')
  if (formedIdx > 0) {
    const formed = entries[formedIdx]!
    for (let i = 0; i < formedIdx; i++) {
      const e = entries[i]!
      if (e.km !== formed.km) continue
      if (e.plantilla !== 'front_group' && e.plantilla !== 'time_gap') continue
      hit('resumenAntesDelSuceso', e.km, `${e.plantilla} antes de breakaway_formed`)
    }
  }

  // --- 5. `breakaway_caught` nombra a quien no iba delante -----------------------------------------
  entries.forEach((e, i) => {
    if (e.plantilla !== 'breakaway_caught') return
    // El último parte de cabeza, SI SIGUE VALIENDO: si entre él y la captura el grupo de delante
    // creció —un puente que llega, dos grupos que se juntan— ya no dice quiénes iban delante, y
    // exigirle que coincida sería medir una foto caducada.
    let front: AuditEntry | null = null
    let stale = false
    for (let j = i - 1; j >= 0; j--) {
      const o = entries[j]!
      if (o.plantilla === 'front_group') {
        front = o
        break
      }
      // …y una criba del pelotón también caduca el parte: después de ella el grupo de cabeza lo
      // decide la carretera y no lo que se contó veinte kilómetros antes.
      if (
        GROWS_THE_FRONT.has(o.plantilla) ||
        CLEARS_THE_ROAD.has(o.plantilla) ||
        OPENING.has(o.plantilla) ||
        o.plantilla === 'peloton_split' ||
        o.plantilla === 'peloton_selection'
      ) {
        stale = true
      }
    }
    if (!front || stale) return
    // Y tiene que ser EL MISMO grupo: si la captura y el último parte de cabeza no comparten ni un
    // nombre, lo que se caza es otro grupo de la carretera —en una etapa rota hay varios— y no una
    // lista congelada. Lo que se audita es la fuga que cambió de gente por el camino.
    if (!e.riders.some((r) => front!.riders.includes(r))) return
    const ausentes = e.riders.filter((r) => !front!.riders.includes(r))
    if (ausentes.length === 0) return
    hit('cazadaFantasma', e.km, `caza a ${ausentes.join(', ')}, que no iban delante`)
  })

  // --- 6. Un grupo perseguidor de UN corredor ------------------------------------------------------
  for (const e of entries) {
    if (e.plantilla !== 'time_gap' && e.plantilla !== 'time_gap_run') continue
    if (num(e, 'chaseSize') !== 1) continue
    if (fieldSize < BUNCH_MIN_RIDERS) continue
    hit('perseguidorDeUno', e.km, `boquete medido contra un grupo de 1 con ${fieldSize} en carrera`)
  }

  // --- 7. Entra o sale alguien del grupo de cabeza sin decirlo -------------------------------------
  {
    let front: string[] = []
    /** En qué entrada se vio por última vez al grupo de cabeza: la marcha se busca a partir de ahí. */
    let frontIdx = -1
    entries.forEach((e, i) => {
      if (CLEARS_THE_ROAD.has(e.plantilla)) {
        front = []
        frontIdx = i
        return
      }
      if (e.plantilla !== 'front_group') return
      /**
       * LOS QUE ENTRAN SIN NOMBRE. Un evento de entrada nombra a tres como mucho —«8 riders jump
       * clear»— y eso no es una contradicción: al lector se le ha dicho que eran ocho. Lo que se
       * audita es que la CUENTA cuadre, no que cada nombre tenga su línea. Este es el presupuesto
       * de entradas anunciadas y todavía no gastadas.
       */
      let anonimos = entries.slice(0, i).reduce((acc, o) => {
        if (!ENTRY.has(o.plantilla)) return acc
        const declarados = num(o, 'saltan') ?? num(o, 'entran') ?? 0
        return acc + Math.max(0, declarados - o.riders.length)
      }, 0)
      anonimos += num(e, 'entran') ?? 0
      /**
       * …Y CUANDO LA CARRERA SE PARTE, LO QUE EXPLICA ES LA CRIBA. Después de un corte del pelotón
       * quién va delante no lo decide un ataque sino la carretera, y la frase del corte ya le ha
       * dicho al lector que la cabeza de carrera es ahora un puñado.
       */
      const shattered = entries
        .slice(frontIdx + 1, i)
        .some((o) => o.plantilla === 'peloton_split' || o.plantilla === 'peloton_selection')
      // QUIÉN APARECE. Todo el que va delante ha entrado antes por un evento que lo explique.
      for (const r of shattered ? [] : e.riders) {
        if (front.includes(r)) continue
        const explained = entries
          .slice(0, i)
          .some((o) => ENTRY.has(o.plantilla) && o.riders.includes(r))
        if (explained) continue
        if (anonimos > 0) {
          anonimos -= 1
          continue
        }
        hit('frenteSinExplicar', e.km, `${r} aparece delante sin haber entrado`)
      }
      /**
       * QUIÉN SE VA. Y sale por otro, entre el parte anterior y éste… SALVO CUANDO LA CABEZA DE
       * CARRERA HA CAMBIADO DE GRUPO. Si por el medio dos grupos se han juntado o alguien ha
       * atacado del de delante, el parte siguiente habla de OTRO grupo: los que ya no aparecen no
       * se han caído de nada, es que la cabeza de carrera es ahora otra cosa, y el lector lo ha
       * leído. Es el mismo olvido que hace el motor cuando el grupo de cabeza deja de ser pequeño.
       */
      const otroGrupo = entries
        .slice(frontIdx + 1, i)
        .some((o) => GROWS_THE_FRONT.has(o.plantilla) || OPENING.has(o.plantilla))
      const salen = otroGrupo ? [] : front.filter((r) => !e.riders.includes(r))
      const declaredOut = num(e, 'salen') ?? 0
      const mudos = salen.filter(
        (r) =>
          !entries
            .slice(frontIdx + 1, i + 1)
            .some((o) => EXIT.has(o.plantilla) && o.riders.includes(r)),
      )
      for (let k = declaredOut; k < mudos.length; k++) {
        hit('frenteSinExplicar', e.km, `${mudos[k]} desaparece del grupo de cabeza sin decirlo`)
      }
      front = [...e.riders]
      frontIdx = i
    })
  }

  // --- 8 y 9. Las dos concordancias rotas -----------------------------------------------------------
  for (const e of entries) {
    if (e.plantilla === 'attack_go' || e.plantilla === 'attack_swarm') {
      const saltan = num(e, 'saltan') ?? e.riders.length
      const tierra = num(e, 'tierra') ?? 0
      /**
       * La frase dice «N more try to go WITH THEM», y con un solo atacante tiene que decir «with
       * him». EL LISTÓN CAMBIA EN LA v40: pedía una marca `solo` en los datos, y el diario ya no la
       * necesita —deriva la concordancia de `saltan`, y si falta, del número de protagonistas
       * (`stageJournal.ts`: `jumped === 1 || datos.solo === 1`)—. Medido, ese listón viejo señalaba
       * 1 defecto en 48 etapas que en el texto renderizado NO existe.
       *
       * Lo que sí sigue siendo defecto, y es lo que este banco tiene que vigilar, es que los dos
       * datos se CONTRADIGAN: si salta uno solo pero el parte nombra a varios, el diario escribe
       * tres nombres y luego «with him».
       */
      if (saltan === 1 && tierra > 0 && e.riders.length > 1 && e.datos.solo == null) {
        hit('ataqueConcordancia', e.km, `salta 1 pero el parte nombra a ${e.riders.length}`)
      }
    }
    /**
     * `pasajerosConcordancia` SE RETIRA EN LA v40, y se deja escrito para que no vuelva a
     * inventarse. Nació en la v25 contra una frase real y rota —«1 of their companion sits on»— y
     * el diario la arregló: hoy `stageJournal.ts` escribe «while one of their companions sits on»
     * en singular y «while N of their companions sit on» en plural, derivándolo de `passengers`
     * sin necesitar ninguna marca del motor.
     *
     * El detector seguía exigiendo esa marca (`datos.solo`), así que señalaba 6 defectos en 48
     * etapas que el lector NO VE. Y el segundo intento de re-encuadrarlo —«pasajero en una fuga de
     * un solo hombre»— también estaba mal: `break_share` nombra a los que MÁS TIRAN, no a toda la
     * fuga, así que un pasajero con un solo nombrado es perfectamente coherente.
     *
     * Un medidor que grita defectos inexistentes es peor que no tenerlo: esconde los de verdad
     * detrás del ruido. La clave se queda en `DEFECTS` para que la tabla del medidor conserve su
     * forma y para que esta explicación tenga dónde vivir.
     */
  }

  // --- 10. El mismo equipo tirando para el mismo líder sin contar nada nuevo -------------------------
  {
    let prev: string | null = null
    for (const e of entries) {
      if (e.plantilla !== 'peloton_pull') continue
      // La identidad del parte: para quién se tira, con qué clase de trabajo, a qué esfuerzo y si se
      // está cazando algo. Si las cuatro repiten, la línea no dice nada que el lector no sepa.
      const key = [
        e.datos.forId ?? e.riders.slice(0, 1).join(''),
        e.datos.forKind ?? '',
        e.datos.effort ?? '',
        e.datos.chasing ?? '',
      ].join('/')
      if (prev === key)
        hit('parteRepetido', e.km, `mismo parte de relevos que el anterior (${key})`)
      prev = key
    }
  }

  // --- 11. El mismo ataque contado en dos líneas seguidas ---------------------------------------------
  entries.forEach((e, i) => {
    if (e.plantilla !== 'front_group') return
    const prev = entries[i - 1]
    if (!prev || prev.km !== e.km) return
    if (prev.plantilla !== 'attack_go' && prev.plantilla !== 'bridge_made') return
    const same =
      e.riders.length === prev.riders.length && e.riders.every((r) => prev.riders.includes(r))
    if (same) hit('ataqueDobleLinea', e.km, `${prev.plantilla} y front_group dicen lo mismo`)
  })

  // --- 12. Dos números que dicen lo mismo y no coinciden -----------------------------------------------
  {
    let maxNarrated = 0
    entries.forEach((e, i) => {
      const gap = num(e, 'gapS')
      if (gap != null && e.plantilla !== 'chase_work') maxNarrated = Math.max(maxNarrated, gap)
      if (e.plantilla !== 'chase_work') return
      const peak = num(e, 'closedS') ?? 0
      // La cúspide del boquete contra la mayor ventaja que el lector ha llegado a leer. Si el motor
      // manda el km de la cúspide, la frase ya puede situarla y las dos cifras dejan de chocar.
      if (peak > maxNarrated + PEAK_TOLERANCE_S && e.datos.peakKm == null) {
        hit('numerosQueSeContradicen', e.km, `cúspide ${peak}s contra ${maxNarrated}s narrados`)
      }
      const prev = entries[i - 1]
      if (!prev || prev.plantilla !== 'breakaway_caught') return
      const away = num(prev, 'awayKm')
      const since = num(e, 'km')
      if (away != null && since != null && away !== since && e.datos.pegado == null) {
        hit('numerosQueSeContradicen', e.km, `«${away} km up the road» contra «${since} km later»`)
      }
    })
  }

  return { counts, findings }
}

// =================================================================================================
// LA ESPINA DORSAL DEL RELATO (v27, docs/motor.md §16)
// =================================================================================================
//
// La v25 arregló que el diario se CONTRADIJERA. El dueño leyó la etapa 1 de Race Andalucía —ya sin
// contradicciones— y dijo otra cosa: «si lees todo el Journal no SABES quién va ganando, quién va
// persiguiendo… es un lío los últimos mensajes». No es que mienta: es que no cuenta una historia.
//
// LA REGLA, que es la que ordena la tanda: en cualquier punto del diario, un lector que haya leído
// desde el principio tiene que poder responder cuatro cosas — QUIÉN VA DELANTE, CON CUÁNTA VENTAJA,
// SOBRE QUIÉN y CUÁNTO QUEDA. Eso no se cuenta con las doce contradicciones de arriba, que miran
// pares de líneas; se cuenta con estas cuatro medidas, que miran el relato ENTERO:
//
//   1. cuántos km aguanta el diario sin una línea de situación (el silencio más largo);
//   2. cuántas veces hay DOS protagonistas «con hueco» a la vez sin relacionarlos;
//   3. en los últimos 15 km, qué fracción de las líneas habla del que gana;
//   4. cuántos nombres distintos de grupo se usan en una misma etapa.
//
// Van aparte de `auditStage` a propósito: una contradicción es un defecto y se cuenta para bajarla a
// cero; esto son PROPIEDADES del relato —hay un mínimo de silencio inevitable y un máximo de
// vocabulario razonable— y se leen como listones, no como errores.

/**
 * LAS LÍNEAS DE SITUACIÓN. Las que dejan al lector sabiendo el estado de la carrera: quién va
 * delante, con cuánto, sobre quién. No es «cualquier línea»: que alguien corone un puerto o que un
 * equipo tire son noticias, pero no responden ninguna de las cuatro preguntas, y una etapa que solo
 * las cuenta se lee como una lista de incidentes.
 */
const SITUATION = new Set([
  'time_gap',
  'time_gap_run',
  'front_group',
  'breakaway_formed',
  'breakaway_caught',
  'move_caught',
  'move_merge',
  'move_faded',
  'bridge_made',
  'attack_sticks',
  'peloton_split',
  'peloton_selection',
  'peloton_regroup',
  'final_km',
  'bunch_sprint',
  'stage_win',
])

/** Lo que PONE A ALGUIEN DELANTE: a partir de aquí hay una carrera de dos velocidades que seguir. */
const PUTS_SOMEONE_AHEAD = new Set([
  'breakaway_formed',
  'front_group',
  'attack_sticks',
  'bridge_made',
  'move_merge',
])

/**
 * LAS LÍNEAS QUE DICEN «FULANO TIENE HUECO». Cada una nombra a alguien y le pone una ventaja: si dos
 * de ellas conviven y hablan de gente distinta sin relacionarse, el lector no puede saber quién va
 * ganando. Es literal del último kilómetro de Race Andalucía: «Schwarz lidera por 16s» y «Bailey
 * tiene 46s» en la misma línea de meta.
 */
const GAP_CLAIM = new Set(['attack_sticks', 'final_km', 'front_group', 'time_gap', 'time_gap_run'])

/**
 * Dentro de cuántos km dos anuncios de ventaja se leen como SIMULTÁNEOS. Tres: a esa distancia el
 * lector todavía tiene el número anterior en la cabeza y los dos compiten por ser «la carrera».
 */
const GAP_CLAIM_WINDOW_KM = 3

/** Los últimos kilómetros que deciden la etapa, y en los que el relato tiene que converger. */
export const FINALE_KM = 15

/**
 * EL VOCABULARIO DE GRUPOS (SPEC 6.15 y docs/motor.md §16). En la carretera hay TRES cosas y por tanto
 * caben tres nombres, ni uno más:
 *
 * - **the lead group** — los que van delante (con uno, su nombre y nada más).
 * - **the chase group** — el grupo que persigue a los de delante, sea quien sea.
 * - **the bunch** — el grueso de la carrera, que ya no pelea por la etapa.
 *
 * «The favourites», «the sprinters' teams» y «the fast men» NO son nombres de grupo: son PAPELES
 * dentro de uno, y usarlos como sujeto es lo que hace que, después de una criba, el lector tenga
 * cuatro nombres para tres cosas y no pueda seguir la carrera.
 *
 * Esta tabla dice qué nombres puede imprimir cada plantilla, contando TODAS sus variantes: la
 * redacción se elige por hash y este medidor no puede saber cuál sale, así que lo que se cuenta es
 * el vocabulario al que la etapa expone al lector. Vive aquí, con el medidor, porque el número tiene
 * que ser el mismo en producción y en el banco; y `stageJournal.test.ts` vigila la otra mitad —que
 * ninguna frase de verdad imprima un nombre que no esté en su fila—, que es lo que impide que la
 * tabla y las plantillas se separen.
 */
export const GROUP_NOUNS: Readonly<Record<string, readonly string[]>> = {
  attack_go: ['the bunch', 'the lead group'],
  attack_short: ['the bunch'],
  attack_swarm: [],
  attack_sticks: [],
  attack_reeled: ['the bunch'],
  move_faded: [],
  move_caught: ['the chase group'],
  move_merge: [],
  bridge_made: ['the lead group'],
  breakaway_formed: ['the lead group'],
  break_cooperation: ['the lead group'],
  break_share: ['the lead group'],
  riders_sit_up: [],
  rider_sits_up: [],
  sprinters_chase: ['the bunch', 'the lead group'],
  sprinters_give_up: ['the bunch'],
  peloton_concedes: ['the bunch', 'the lead group'],
  peloton_pull: ['the bunch', 'the lead group'],
  peloton_split: ['the chase group', 'the lead group'],
  peloton_selection: ['the chase group', 'the lead group'],
  peloton_regroup: ['the chase group', 'the lead group'],
  time_gap: ['the lead group', 'the chase group', 'the bunch'],
  time_gap_run: ['the lead group', 'the chase group', 'the bunch'],
  front_group: ['the lead group'],
  chase_work: ['the chase group'],
  breakaway_caught: ['the bunch', 'the lead group'],
  bunch_sprint: ['the bunch'],
  stage_win: ['the chase group', 'the bunch', 'the lead group'],
}

/** Qué nombres de grupo puede imprimir esta línea. */
export function groupNounsOf(e: AuditEntry): readonly string[] {
  return GROUP_NOUNS[e.plantilla] ?? []
}

/**
 * TODOS los nombres de grupo que se vigilan, incluidos los que la v27 retira. Es la lista contra la
 * que `stageJournal.test.ts` lee las frases de verdad: si aparece uno que la plantilla no tiene
 * declarado en `GROUP_NOUNS`, el test falla y la tabla y el texto no se pueden separar.
 *
 * Va ordenada de más larga a más corta a propósito: «the chase group» contiene «the chase», y quien
 * la recorra tiene que quedarse con la más larga primero o contará dos nombres donde hay uno.
 */
export const WATCHED_GROUP_NOUNS: readonly string[] = [
  "the sprinters' teams",
  'the lead-out trains',
  'the chase group',
  'the front group',
  'the lead group',
  'the favourites',
  'the fast men',
  'the escapees',
  'the chasers',
  'the peloton',
  'the leaders',
  'the chase',
  'the bunch',
  'the break',
  'the group',
  'the field',
  'the move',
  'the pack',
]

/** Las cuatro medidas de una etapa. Números, no defectos: se leen contra un listón. */
export interface StoryMetrics {
  /** Km de la etapa según su última línea: el eje sobre el que se miden los silencios. */
  km: number
  /** Cuántas líneas tiene la crónica. El hilo de situación cuesta líneas: hay que verlo. */
  lineas: number
  /** El silencio más largo, en km, sin una línea de situación. */
  mudoKm: number
  /** Dónde empieza ese silencio, para poder ir a mirarlo. */
  mudoDesdeKm: number
  /** ¿Había alguien delante durante ese silencio? Con la carrera junta el silencio no engaña. */
  mudoConFuga: boolean
  /** Veces que dos protagonistas distintos aparecen «con hueco» a la vez sin relacionarse. */
  dosConHueco: number
  /** Líneas en los últimos `FINALE_KM` km. */
  finalLineas: number
  /** …y cuántas de ellas hablan del que gana la etapa. */
  finalDelGanador: number
  /** Cuántos nombres distintos de grupo se usan en la etapa (el listón son tres). */
  nombresDeGrupo: number
}

/**
 * Mide la ESPINA DORSAL de una crónica: si el lector puede seguir la carrera leyéndola. Misma
 * entrada que `auditStage` y mismo sitio, para que el número de producción y el del banco se
 * comparen sin traducir nada.
 */
export function storyMetrics(entries: readonly AuditEntry[]): StoryMetrics {
  const km = entries.reduce((mx, e) => Math.max(mx, e.km), 0)
  const vacio: StoryMetrics = {
    km,
    lineas: entries.length,
    mudoKm: 0,
    mudoDesdeKm: 0,
    mudoConFuga: false,
    dosConHueco: 0,
    finalLineas: 0,
    finalDelGanador: 0,
    nombresDeGrupo: 0,
  }
  if (entries.length === 0) return vacio

  // --- 1. El silencio más largo sin una línea de situación --------------------------------------
  // Se mide de la SALIDA a la META, no de la primera línea a la última: los primeros kilómetros sin
  // una palabra son silencio igual, y son justo los que el lector lee con más ganas.
  //
  // Y se anota si en ese tramo había ALGO EN LA CARRETERA, porque no es el mismo silencio: con la
  // carrera junta y nadie fugado, el estado es «van todos juntos» y el lector lo sabe aunque no se
  // lo repitan; con un hombre delante y una ventaja moviéndose, callarse es perderle.
  let mudoKm = 0
  let mudoDesdeKm = 0
  let mudoConFuga = false
  let last = 0
  let algoDelante = false
  for (const e of entries) {
    if (SITUATION.has(e.plantilla)) {
      if (e.km - last > mudoKm) {
        mudoKm = e.km - last
        mudoDesdeKm = last
        mudoConFuga = algoDelante
      }
      last = e.km
    }
    if (PUTS_SOMEONE_AHEAD.has(e.plantilla)) algoDelante = true
    if (CLEARS_THE_ROAD.has(e.plantilla)) algoDelante = false
  }
  if (km - last > mudoKm) {
    mudoKm = km - last
    mudoDesdeKm = last
    mudoConFuga = algoDelante
  }

  // --- 2. Dos hombres «con hueco» a la vez -------------------------------------------------------
  // Un anuncio de ventaja que se cuenta RESPECTO DEL LÍDER (`respecto`) no compite con él: es la
  // misma carrera contada, que es exactamente lo que se pide en el desenlace.
  let dosConHueco = 0
  const abiertos: { km: number; riders: readonly string[] }[] = []
  for (const e of entries) {
    if (!GAP_CLAIM.has(e.plantilla)) continue
    if (e.riders.length === 0) continue
    if (Number(e.datos.gapS ?? e.datos.margin ?? 0) <= 0) continue
    if (e.datos.respecto != null) continue
    const choca = abiertos.some(
      (o) => e.km - o.km <= GAP_CLAIM_WINDOW_KM && !o.riders.some((r) => e.riders.includes(r)),
    )
    if (choca) dosConHueco += 1
    abiertos.push({ km: e.km, riders: e.riders })
  }

  // --- 3. El desenlace habla del que gana ---------------------------------------------------------
  const winner = entries.find((e) => e.plantilla === 'stage_win')?.riders[0] ?? null
  const finale = entries.filter((e) => e.km >= km - FINALE_KM)
  // «Hablar del que gana» es nombrarle: como protagonista de la línea, o como el líder respecto del
  // cual se cuenta una subtrama (`liderId`), que es la otra forma de que el lector lo lea.
  const finalDelGanador =
    winner === null
      ? 0
      : finale.filter((e) => e.riders.includes(winner) || e.datos.liderId === winner).length

  // --- 4. Cuántos nombres de grupo ------------------------------------------------------------------
  const palabras = new Set<string>()
  for (const e of entries) for (const w of groupNounsOf(e)) palabras.add(w)

  return {
    km,
    lineas: entries.length,
    mudoKm,
    mudoDesdeKm,
    mudoConFuga,
    dosConHueco,
    finalLineas: finale.length,
    finalDelGanador,
    nombresDeGrupo: palabras.size,
  }
}

/** Suma las cuentas de varias etapas, y de paso cuántas etapas tocan cada defecto. */
export interface WorldAudit {
  stages: number
  counts: Record<DefectKey, number>
  stagesWith: Record<DefectKey, number>
  /** Las cuatro medidas de la espina dorsal (v27), sumadas sobre el mundo. */
  story: WorldStory
}

/**
 * Las cuatro medidas de §5 del encargo, agregadas. El silencio se lee por su PEOR caso y por su
 * media —un mundo con una etapa muda y setenta habladoras no es el mismo que setenta calladas— y el
 * desenlace, por la fracción global de líneas que hablan del ganador.
 */
export interface WorldStory {
  stages: number
  /** El silencio más largo de todo el mundo, y en qué etapa está. */
  peorMudoKm: number
  peorMudoEtapa: string
  /** Media de los silencios más largos de cada etapa. */
  mudoKmSuma: number
  /** Etapas cuyo silencio más largo pasa del listón, y de ésas, las que lo pasan CON alguien delante. */
  etapasMudas: number
  etapasMudasConFuga: number
  dosConHueco: number
  etapasConDos: number
  /** Líneas de crónica en total: el precio en texto del hilo de situación. */
  lineasSuma: number
  finalLineas: number
  finalDelGanador: number
  /** Etapas que usan más de tres nombres de grupo, y el peor de todos. */
  etapasConCuatroNombres: number
  nombresMax: number
}

/**
 * A partir de cuántos km sin una línea de situación se cuenta una etapa como MUDA. Treinta es lo que
 * el dueño señaló leyendo Race Andalucía («el estado de carrera no puede quedarse mudo 35 km»), y en
 * una etapa de 150-200 km es un tercio largo de carrera sin saber quién va ganando.
 */
export const MUTE_KM_LIMIT = 30

export function emptyWorldAudit(): WorldAudit {
  return {
    stages: 0,
    counts: Object.fromEntries(DEFECTS.map((d) => [d, 0])) as Record<DefectKey, number>,
    stagesWith: Object.fromEntries(DEFECTS.map((d) => [d, 0])) as Record<DefectKey, number>,
    story: {
      stages: 0,
      peorMudoKm: 0,
      peorMudoEtapa: '',
      mudoKmSuma: 0,
      etapasMudas: 0,
      etapasMudasConFuga: 0,
      dosConHueco: 0,
      etapasConDos: 0,
      lineasSuma: 0,
      finalLineas: 0,
      finalDelGanador: 0,
      etapasConCuatroNombres: 0,
      nombresMax: 0,
    },
  }
}

export function addToWorld(world: WorldAudit, result: AuditResult): WorldAudit {
  world.stages += 1
  for (const d of DEFECTS) {
    world.counts[d] += result.counts[d]
    if (result.counts[d] > 0) world.stagesWith[d] += 1
  }
  return world
}

/** Suma las cuatro medidas de una etapa al mundo. `id` solo se usa para poder ir a mirar el peor. */
export function addStoryToWorld(world: WorldAudit, m: StoryMetrics, id: string): WorldAudit {
  const s = world.story
  s.stages += 1
  if (m.mudoKm > s.peorMudoKm) {
    s.peorMudoKm = m.mudoKm
    s.peorMudoEtapa = `${id} (km ${m.mudoDesdeKm}-${m.mudoDesdeKm + m.mudoKm})`
  }
  s.mudoKmSuma += m.mudoKm
  if (m.mudoKm > MUTE_KM_LIMIT) {
    s.etapasMudas += 1
    if (m.mudoConFuga) s.etapasMudasConFuga += 1
  }
  s.dosConHueco += m.dosConHueco
  if (m.dosConHueco > 0) s.etapasConDos += 1
  s.lineasSuma += m.lineas
  s.finalLineas += m.finalLineas
  s.finalDelGanador += m.finalDelGanador
  if (m.nombresDeGrupo > 3) s.etapasConCuatroNombres += 1
  s.nombresMax = Math.max(s.nombresMax, m.nombresDeGrupo)
  return world
}
