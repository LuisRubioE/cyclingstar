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
  'break_dropped',
  'riders_drop_break',
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
    const closed = entries
      .slice(i + 1)
      .some(
        (o) =>
          o.km > e.km && CLOSING.has(o.plantilla) && o.riders.some((r) => e.riders.includes(r)),
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
    let front: AuditEntry | null = null
    for (let j = i - 1; j >= 0; j--) {
      if (entries[j]!.plantilla === 'front_group') {
        front = entries[j]!
        break
      }
    }
    if (!front) return
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
      if (e.plantilla !== 'front_group') return
      const declared = new Set<string>(
        typeof e.datos.entran === 'string' && e.datos.entran !== ''
          ? String(e.datos.entran).split('|')
          : [],
      )
      // QUIÉN APARECE. Todo el que va delante ha entrado antes por un evento que lo explique.
      for (const r of e.riders) {
        if (front.includes(r) || declared.has(r)) continue
        const explained = entries
          .slice(0, i)
          .some((o) => ENTRY.has(o.plantilla) && o.riders.includes(r))
        if (!explained) hit('frenteSinExplicar', e.km, `${r} aparece delante sin haber entrado`)
      }
      // QUIÉN SE VA. Y sale por otro, entre el parte anterior y éste.
      const salen = front.filter((r) => !e.riders.includes(r))
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
      // La frase dice «N more try to go WITH THEM» con un solo protagonista, y con `tierra` = 1
      // además conjuga «1 more tries». Solo es defecto si el motor no manda ya la concordancia.
      if (saltan === 1 && tierra > 0 && e.datos.solo == null) {
        hit('ataqueConcordancia', e.km, `${tierra} se quedan a rueda de UN corredor`)
      }
    }
    if (e.plantilla === 'break_share' && num(e, 'passengers') === 1 && e.datos.solo == null) {
      hit('pasajerosConcordancia', e.km, '«1 of their companion sits on»')
    }
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

/** Suma las cuentas de varias etapas, y de paso cuántas etapas tocan cada defecto. */
export interface WorldAudit {
  stages: number
  counts: Record<DefectKey, number>
  stagesWith: Record<DefectKey, number>
}

export function emptyWorldAudit(): WorldAudit {
  return {
    stages: 0,
    counts: Object.fromEntries(DEFECTS.map((d) => [d, 0])) as Record<DefectKey, number>,
    stagesWith: Object.fromEntries(DEFECTS.map((d) => [d, 0])) as Record<DefectKey, number>,
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
