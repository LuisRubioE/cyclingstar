#!/usr/bin/env node
/**
 * LA VERDAD DE LA PRUEBA DE LECTURA (E2, docs/retransmision.md §16.5; D-60, 16-i y 16-w; paso 10b).
 *
 * La prueba de lectura es la puerta del encendido: el dueño y una persona que no conoce el diseño ven
 * tres etapas en `Watch` y, en tres puntos sorteados de cada una, contestan sin ayuda quién va delante,
 * con cuánta ventaja, sobre quién y cuánto queda; y, cuando delante del pelotón va una fuga de hasta
 * `BROADCAST.nameWholeGroupUpTo` (12), qué lleva cada uno de los de delante y quién tira detrás y por
 * qué. Esta es la herramienta del organizador, el que prepara, pausa y comprueba, y hace dos cosas:
 *
 *  - `--draw <semilla>` (puntos 3, 4 y 6), ANTES de ver nada: elige las tres etapas (la llana, la reina y
 *    la clásica más recientes con línea, por `StageKind`; si no hay clásica con línea, la carrera de un
 *    día más larga que la tenga), sortea con la semilla los tres km a meta de cada una (enteros entre 5
 *    y lengthKm − 5, separados al menos 20 y uno en los últimos 30) y, si en ninguno de los nueve va
 *    delante una fuga así, uno más entre los km en que la hay. Imprime la semilla, las etapas y los km,
 *    que se apuntan y no se enseñan a los dos. La misma semilla con la misma base da lo mismo.
 *  - `<raceKey> <día> <kmAMeta>` (punto 7), DESPUÉS: la verdad del punto, lo que pintan la capa fija y la
 *    barra cuando la capa fija llega a ese km (la primera décima en que `toGoKm` ≤ km): el grupo 1 con
 *    sus miembros y el maillot que lleva cada uno (`worn`, §4.8), la diferencia principal con su grupo de
 *    referencia (D-17), los km a meta de la cabeza y, del grupo que persigue, la línea `Pulling:` con el
 *    porqué de cada equipo (§6.4). Las palabras de la pantalla, en inglés y como las escribe la web; lo
 *    demás, en castellano. Con `--at <h:mm:ss>`, la verdad a esa hora de carrera: la que enseña la segunda
 *    línea de la capa fija al tocarla con la pantalla en pausa (6-f), por si el organizador pausó tarde.
 *
 * Toda la lógica vive en `packages/shared/src/broadcast/readingTest.ts`, pura y probada sobre las etapas
 * congeladas (`readingTest.test.ts`); aquí solo está la fontanería: leer la base y escribir.
 *
 * DE DÓNDE SALE CADA COSA, como la sirve la API:
 *  - la línea, de `stage_timelines` (`readStageTimeline`, la misma lectura y el mismo decodificador que
 *    la ruta de la cabecera); sin línea o con una lápida no hay verdad, y lo dice (D-12);
 *  - los nombres de los corredores y de los equipos, los de hoy (`getCastIdentities`, como la cabecera);
 *  - el reparto, sin velo y sin corredores propios: el de quien conoce la carrera hasta la etapa
 *    anterior, que es lo que D-37 exige para ver una etapa (§10.10). Si a una de las dos personas le falta
 *    un campeonato que no ha visto, en su barra ese campeón va con la equipación de su equipo;
 *  - el `StageKind` de cada etapa, el de la etapa que corre el mundo (`raceStagesForWorld`, el recorrido
 *    congelado), que es el que pone la API (`stageContextOf`, `spec.kind`);
 *  - el mundo, el de la base (`getCurrentWorld`); una clave sin `:sN` toma su temporada.
 *
 * Como `scripts/race-radio.mjs --db`, va directo a la base: necesita `DATABASE_URL` en la máquina desde la
 * que se mira, y solo lee.
 *
 * Uso (hacen falta los `dist` de packages/shared, packages/engine y packages/db):
 *   pnpm exec tsc -b
 *   DATABASE_URL=… node scripts/pl-truth.mjs --draw <semilla>
 *   DATABASE_URL=… node scripts/pl-truth.mjs <raceKey> <día> <kmAMeta> [--at <h:mm:ss>]
 *
 *   p. ej. node scripts/pl-truth.mjs --draw 20261008
 *          node scripts/pl-truth.mjs race-france:s0 7 42
 *          node scripts/pl-truth.mjs race-france:s0 7 42 --at 3:21:50
 *
 * Sale con 0 si todo fue bien; 1, uso, fontanería o un km al que la capa fija no llega; 2, la etapa no
 * tiene línea (no se ha corrido, corrió sin grabación o tiene una lápida) o, con `--draw`, falta alguna
 * de las tres etapas; 3, es una crono, que la prueba no usa.
 */

// ---------------------------------------------------------------------------- argumentos

const USAGE =
  'Uso: node scripts/pl-truth.mjs --draw <semilla>\n' +
  '     node scripts/pl-truth.mjs <raceKey> <día> <kmAMeta> [--at <h:mm:ss>]'

const argv = process.argv.slice(2)
const optIx = (name) => argv.indexOf(`--${name}`)
const opt = (name) => {
  const i = optIx(name)
  return i >= 0 ? (argv[i + 1] ?? null) : null
}

/** Un fallo que se cuenta y no se vuelca: esto se usa mirándolo. */
class Exit extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

/** `3:21:50`, `21:50`, `7310` o `7310.4`: segundos de carrera. */
function parseRaceClock(text) {
  if (!/^\d+(:\d{1,2}){0,2}(\.\d+)?$/.test(text)) return null
  return text.split(':').reduce((s, part) => s * 60 + Number(part), 0)
}

// ---------------------------------------------------------------------------- dependencias

async function load() {
  const missing = () => {
    throw new Exit(
      1,
      'faltan los dist de packages/shared, packages/engine o packages/db: pnpm exec tsc -b',
    )
  }
  const S = await import('../packages/shared/dist/index.js').catch(missing)
  const E = await import('../packages/engine/dist/index.js').catch(missing)
  const db = await import('../packages/db/dist/index.js').catch(missing)
  return { S, E, db }
}

// ---------------------------------------------------------------------------- formato

const pad = (s, n) => String(s).padEnd(n)

/** El reloj de carrera como lo enseña la segunda línea de la capa fija, `2:09:00` (6-f). */
function raceClock(t) {
  const s = Math.max(0, Math.floor(t))
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** El corredor con su dorsal: `107 Andrea Rossi`. */
const riderLabel = (card) => (card.bib === null ? card.name : `${card.bib} ${card.name}`)

/** Lo que lleva un corredor: las palabras de su icono y, en castellano, lo que no se ve en él. */
function wornLabel(S, card) {
  const extra = card.worn.kind === 'leader' && card.worn.delegated ? ' (lo lleva delegado)' : ''
  const team = card.team === null ? '' : ` · ${card.team.name}`
  return `${S.wornText(card)}${extra}${team}`
}

/** Contra quién mide la capa fija, en castellano (D-17). */
const REF_WORDS = {
  bunch: 'el pelotón',
  jersey_group:
    'el primer grupo de detrás con un maillot de líder o un top 3 de salida, porque el pelotón va delante o no lo hay',
  second:
    'el segundo grupo, porque el pelotón va delante o no lo hay y detrás nadie lleva maillot de líder ni es top 3 de salida',
}

/** La flecha de la tendencia de la capa fija (§6.2). */
const arrowOf = (trend) => (trend?.arrow === 'up' ? ' ▲' : trend?.arrow === 'down' ? ' ▼' : '')

/** LA VERDAD DE UN PUNTO, para el organizador: las palabras de la pantalla en inglés y lo demás en castellano. */
function printTruth(S, BROADCAST, truth, head) {
  const { instant, front, behind, cards } = truth
  const gap = instant.mainGap
  const out = []
  out.push(`LA VERDAD · ${head.title}`)
  out.push(`punto: ${truth.kmToGo} km a meta`)
  out.push(
    `instante: ${raceClock(truth.t)} de carrera (${truth.t.toFixed(1)} s), ${head.atRequested ? 'la hora pedida con --at' : 'cuando la capa fija llega a ese km'}`,
  )
  if (head.atRequested && Math.abs(instant.toGoKm - truth.kmToGo) > 1)
    out.push(
      `ojo: a esa hora la capa fija marca ${instant.toGoKm.toFixed(1)} km a meta, no ${truth.kmToGo}`,
    )
  out.push('')
  const overlay =
    gap === null
      ? 'Bunch together'
      : `${S.mainGapText(gap.gapS)}${arrowOf(gap.trend)}${behind === null ? '' : ` ${S.versusText(behind, cards)}`}`
  out.push(`capa fija: ${S.toGoText(instant.toGoKm, instant.lapsToGo)} · ${overlay}`)
  if (instant.toGoKm * 1000 < BROADCAST.quietFinalM)
    out.push(
      `   (en los últimos ${BROADCAST.quietFinalM} m la pantalla solo enseña la distancia: ni diferencia ni huecos, §6.9)`,
    )
  out.push('')
  // 1. Quién va delante
  out.push(`1. quién va delante: la fila 1 de la barra, ${S.barLabelText(front, cards)}`)
  if (front.size <= BROADCAST.nameWholeGroupUpTo)
    for (const card of truth.frontCards)
      out.push(`     ${riderLabel(card)} · ${wornLabel(S, card)}`)
  else if (front.jerseys.length > 0)
    out.push(
      `     con los maillots de líder: ${front.jerseys.map((j) => S.JERSEY_LABEL[j]).join(', ')}`,
    )
  out.push(
    `   (bien: ${front.size <= BROADCAST.byNamesUpTo ? 'los nombres exactos' : 'su palabra y su tamaño, con un corredor de margen'})`,
  )
  // 2, 3. Con cuánta ventaja y sobre quién
  if (gap === null) {
    out.push('2. con cuánta ventaja: ninguna, Bunch together (un solo grupo en carrera)')
    out.push('3. sobre quién: nadie')
  } else {
    out.push(
      `2. con cuánta ventaja: ${S.mainGapText(gap.gapS)}${arrowOf(gap.trend)} (${gap.gapS.toFixed(1)} s; bien a 10 s o la cifra de la capa fija)`,
    )
    const row = behind === null ? null : truth.bar.find((g) => g.g === behind.g)
    // el pelotón de D-17 sin los dos tercios es el grupo del título, que la barra llama por su papel (6-b)
    const ref =
      gap.ref === 'bunch' && behind !== null && behind.role !== 'bunch'
        ? 'el pelotón, que es el grupo del título y no llega a los dos tercios de la carrera'
        : REF_WORDS[gap.ref]
    out.push(
      `3. sobre quién: ${behind === null ? '?' : S.versusText(behind, cards)} — ${ref}` +
        (row === null || row === undefined
          ? ''
          : `; en la barra, la fila ${row.number} (${S.barLabelText(row, cards)})`),
    )
  }
  // 4. Cuánto queda
  out.push(
    `4. cuánto queda: ${S.toGoText(instant.toGoKm, instant.lapsToGo)} (${instant.toGoKm.toFixed(2)} km; bien a 1 km)`,
  )
  // 5, 6. La fuga de hasta 12
  out.push('')
  if (!truth.breakaway) {
    out.push(
      `fuga de hasta ${BROADCAST.nameWholeGroupUpTo} delante del pelotón: no; en este punto, solo las cuatro preguntas`,
    )
  } else {
    out.push(
      `fuga de hasta ${BROADCAST.nameWholeGroupUpTo} delante del pelotón: sí; en este punto, las seis preguntas`,
    )
    out.push('5. qué lleva cada uno de los de delante (mirando la barra):')
    for (const card of truth.frontCards) out.push(`     ${riderLabel(card)}: ${wornLabel(S, card)}`)
    const whom = behind === null ? '' : ` (${S.barLabelText(behind, cards)})`
    if (truth.pulling === null)
      out.push(`6. quién tira detrás y por qué${whom}: nadie, sin línea Pulling:`)
    else {
      const desktop = S.pullingText(truth.pulling, cards)
      const mobile = S.pullingText(truth.pulling, cards, true)
      out.push(`6. quién tira detrás y por qué${whom}: ${desktop}`)
      // en el móvil, la línea va solo bajo la fila del título (y las del espectador), con un equipo (6-d)
      if (behind?.kind !== 'peloton')
        out.push('     en el móvil no va bajo la fila: sale al tocarla')
      else if (mobile !== desktop) out.push(`     en el móvil, bajo la fila: ${mobile}`)
    }
  }
  // La barra entera, para juzgar lo que no es exacto
  out.push('')
  out.push('la barra en ese instante (en escritorio):')
  for (const g of truth.bar) {
    const gapCol = g.number === 1 ? '' : S.mainGapText(g.gap.toHeadS)
    out.push(
      `  ${pad(g.number, 3)}${pad(S.barLabelText(g, cards), 46)} ${pad(gapCol, 9)} km ${g.km.toFixed(1)}`,
    )
    if (g.label.k !== 'names' && g.size <= BROADCAST.nameWholeGroupUpTo)
      out.push(
        `       ${g.members.map((r) => `${cards[r]?.name ?? `#${r + 1}`} [${cards[r] === undefined ? '?' : S.wornText(cards[r])}]`).join(' · ')}`,
      )
    const line = S.pullingLineOf(g.detail, g.members, cards)
    if (line !== null) out.push(`       ${S.pullingText(line, cards)}`)
  }
  if (instant.inTransit.length > 0)
    out.push(
      `  y ${instant.inTransit.length} en tránsito entre dos grupos, que no van en ninguna fila`,
    )
  console.log(out.join('\n'))
}

// ---------------------------------------------------------------------------- la base

/** El mundo de la base: su día da la temporada de una clave sin `:sN` y su id, el recorrido congelado. */
async function worldOf(ctx) {
  const world = await ctx.db.getCurrentWorld(ctx.conn.db)
  if (world === null) throw new Exit(1, 'la base no tiene mundo')
  return world
}

/**
 * LA LÍNEA DE UNA ETAPA, como la lee la ruta de la cabecera (`readStageTimeline`). Sin fila, dice si la
 * etapa no se ha corrido o corrió sin grabar; con una lápida, su motivo.
 */
async function lineOf(ctx, raceKey, day) {
  const { db, conn } = ctx
  try {
    const tl = await db.readStageTimeline(conn.db, db.worldHorizon, raceKey, day)
    if (tl !== null) return tl
  } catch (err) {
    if (err instanceof db.TimelineUnavailableError)
      throw new Exit(
        2,
        err.reason === 'decode'
          ? `la línea de ${raceKey} etapa ${day} no se deja leer (un cuerpo dañado o un format sin ` +
              'decodificador, D-10): la etapa no tiene Watch. No hay línea de la que sacar la verdad.'
          : `${raceKey} etapa ${day} tiene una lápida en stage_timelines (${err.reason}): la grabación ` +
              'falló y la etapa abre solo en Report. No hay línea de la que sacar la verdad.',
      )
    throw err
  }
  const ran =
    await conn.client`select 1 from stage_snapshots where race_id = ${raceKey} and stage_day = ${day} limit 1`
  throw new Exit(
    2,
    ran.length === 0
      ? `${raceKey} etapa ${day} no se ha corrido: no tiene snapshot ni línea.`
      : `${raceKey} etapa ${day} corrió sin línea (sin fila en stage_timelines: con TIMELINE_RECORD=off o ` +
          'antes del paso 5). No hay línea de la que sacar la verdad.',
  )
}

/** Las cartas servidas de una etapa: el reparto congelado con los nombres de hoy, como la cabecera. */
async function screenOf(ctx, tl, race) {
  const ids = await ctx.db.getCastIdentities(
    ctx.conn.db,
    tl.cast.riders.map((c) => c.riderId),
    tl.cast.teams.map((t) => t.teamId),
  )
  return ctx.S.readingScreenOf(
    tl,
    {
      rider: (id) => ids.riders.get(id)?.name ?? id,
      team: (id) => ids.teams.get(id)?.name ?? id,
    },
    race?.championshipCategory ?? 'elite',
  )
}

/** Las etapas de una carrera como las corre el mundo (el recorrido congelado), una consulta por carrera. */
function stagesCache(ctx, world) {
  const memo = new Map()
  return async (raceKey, raceId, season) => {
    let hit = memo.get(raceKey)
    if (hit === undefined) {
      hit = await ctx.db.raceStagesForWorld(ctx.conn.db, world.worldId, raceKey, raceId, season)
      memo.set(raceKey, hit)
    }
    return hit
  }
}

// ---------------------------------------------------------------------------- un punto

async function truthOfPoint(ctx, [keyArg, dayArg, kmArg]) {
  const { S, E } = ctx
  const day = Number(dayArg)
  const km = Number(kmArg)
  const atArg = opt('at')
  const at = atArg === null ? null : parseRaceClock(atArg)
  if (
    !Number.isInteger(day) ||
    day < 1 ||
    !Number.isFinite(km) ||
    km < 0 ||
    (atArg !== null && at === null)
  )
    throw new Exit(1, USAGE)
  const world = await worldOf(ctx)
  const parsed = S.parseRaceKey(keyArg)
  const season = parsed.season ?? S.currentSeason(world.currentDay)
  const raceKey = `${parsed.raceId}:s${season}`
  const race = E.SEASON_CALENDAR.find((r) => r.id === parsed.raceId)
  const tl = await lineOf(ctx, raceKey, day)
  if (tl.timeTrial)
    throw new Exit(
      3,
      `${raceKey} etapa ${day} es una crono: la prueba de lectura pregunta por grupos y no usa cronos.`,
    )
  if (km > tl.lengthKm)
    throw new Exit(
      1,
      `${raceKey} etapa ${day} mide ${tl.lengthKm.toFixed(1)} km: no hay ${km} km a meta.`,
    )
  const stage = (await stagesCache(ctx, world)(raceKey, parsed.raceId, season))[day - 1]
  const screen = await screenOf(ctx, tl, race)
  const truth =
    at === null ? S.readingTruthsOf(tl, screen, [km])[0] : S.readingTruthAt(tl, screen, km, at)
  if (truth === null || truth === undefined)
    throw new Exit(
      1,
      `la capa fija no llega a ${km} km a meta: la cabeza se pinta a medio bloque de la línea.`,
    )
  printTruth(S, S.BROADCAST, truth, {
    title: `${race?.name ?? parsed.raceId} · etapa ${day} (${raceKey}) · ${stage?.kind ?? '?'} · ${tl.lengthKm.toFixed(1)} km`,
    atRequested: at !== null,
  })
}

// ---------------------------------------------------------------------------- el sorteo

const KIND_WORDS = { llana: 'llana', reina: 'reina', clasica: 'clásica' }

async function draw(ctx, seed) {
  const { S, E } = ctx
  const world = await worldOf(ctx)
  const stagesOf = stagesCache(ctx, world)
  // Las etapas con línea (sin lápidas) y lo que la elección lee de cada una.
  const rows = await ctx.conn
    .client`select race_id, stage_day, game_day from stage_timelines where format <> 0`
  const candidates = []
  for (const row of rows) {
    const { raceId, season } = S.parseRaceKey(row.race_id)
    const race = E.SEASON_CALENDAR.find((r) => r.id === raceId)
    if (race === undefined || season === null) continue
    const stage = (await stagesOf(row.race_id, raceId, season))[row.stage_day - 1]
    if (stage === undefined) continue
    candidates.push({
      raceKey: row.race_id,
      day: row.stage_day,
      gameDay: row.game_day,
      kind: stage.kind,
      timeTrial: stage.timeTrial,
      oneDay: race.stages.length === 1,
      lengthKm: E.stageLengthKm(stage.profile),
    })
  }
  const picks = S.pickReadingStages(candidates)
  const out = []
  out.push('SORTEO DE LA PRUEBA DE LECTURA (docs/retransmision.md §16.5, puntos 3, 4 y 6)')
  out.push(
    `semilla: ${seed} · mundo en el día de juego ${world.currentDay} (temporada ${S.currentSeason(world.currentDay)}) · ${candidates.length} etapas con línea`,
  )
  out.push('')
  const chosen = []
  for (const kind of ['llana', 'reina', 'clasica']) {
    const pick = picks[kind]
    if (pick === null) {
      out.push(
        `${pad(KIND_WORDS[kind], 9)}ninguna etapa con línea${kind === 'clasica' ? ', ni una carrera de un día que la tenga' : ''}`,
      )
      continue
    }
    const { raceId } = S.parseRaceKey(pick.raceKey)
    const race = E.SEASON_CALENDAR.find((r) => r.id === raceId)
    const tl = await lineOf(ctx, pick.raceKey, pick.day)
    const screen = await screenOf(ctx, tl, race)
    // una semilla por etapa: la apuntada y la etapa, para que dos de igual longitud no den los mismos km
    const kms = S.drawReadingPoints(`${seed}:${pick.raceKey}:${pick.day}`, tl.lengthKm)
    const truths = S.readingTruthsOf(tl, screen, kms)
    chosen.push({ pick, race, tl, screen, kms, truths })
    const note =
      kind === 'clasica' && picks.clasicaFallback
        ? ' (no hay clásica con línea: la carrera de un día más larga que la tiene)'
        : ''
    out.push(
      `${pad(KIND_WORDS[kind], 9)}${race?.name ?? raceId} · etapa ${pick.day} (${pick.raceKey}) · ${pick.kind} · ` +
        `${tl.lengthKm.toFixed(1)} km · corrida el día ${pick.gameDay}${note}`,
    )
    out.push(`${pad('', 9)}km a meta: ${kms.join(' · ')}`)
  }
  out.push('')
  // El punto de la fuga (punto 6): solo si en ninguno de los nueve va delante una fuga de hasta 12.
  let extra = null
  if (chosen.length > 0) {
    const withBreak = chosen.some((c) => c.truths.some((x) => x?.breakaway === true))
    if (withBreak)
      out.push(
        `la fuga: al menos un punto tiene delante una fuga de hasta ${S.BROADCAST.nameWholeGroupUpTo}; no se sortea otro.`,
      )
    else {
      const all = chosen.flatMap((c) => S.breakawayKmsOf(c.tl, c.screen).map((km) => ({ c, km })))
      extra = S.drawBreakawayPoint(seed, all)
      out.push(
        extra === null
          ? `la fuga: en ninguna de las etapas va delante una fuga de hasta ${S.BROADCAST.nameWholeGroupUpTo}; no hay punto que sortear.`
          : `la fuga: ninguno de los puntos tiene delante una fuga de hasta ${S.BROADCAST.nameWholeGroupUpTo}; ` +
              `se sortea uno más entre los ${all.length} km en que la hay: ${extra.c.pick.raceKey} etapa ${extra.c.pick.day}, ` +
              `km a meta ${extra.km}.`,
      )
    }
    out.push('')
    out.push('La verdad de cada punto, después de la prueba:')
    for (const c of chosen)
      for (const km of c.kms)
        out.push(`  node scripts/pl-truth.mjs ${c.pick.raceKey} ${c.pick.day} ${km}`)
    if (extra !== null)
      out.push(
        `  node scripts/pl-truth.mjs ${extra.c.pick.raceKey} ${extra.c.pick.day} ${extra.km}`,
      )
    out.push('')
    out.push(
      'Estos km no se enseñan a los dos. Ninguno ha visto estas etapas, y cada uno conoce las anteriores ' +
        'de su carrera (D-37: si no, Watch abre con la puerta y la etapa no empieza).',
    )
  }
  console.log(out.join('\n'))
  if (chosen.length < 3)
    throw new Exit(
      2,
      'faltan etapas con línea para la prueba: hacen falta una llana, una reina y una clásica.',
    )
}

// ---------------------------------------------------------------------------- main

async function main() {
  const seedIx = optIx('draw')
  const seed = seedIx >= 0 ? opt('draw') : null
  const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--at')
  if (seedIx >= 0 ? seed === null || seed.startsWith('--') : positional.length !== 3)
    throw new Exit(1, USAGE)
  const url = process.env.DATABASE_URL
  if (!url) throw new Exit(1, 'pl-truth necesita DATABASE_URL: lee la línea grabada de la base')
  const { S, E, db } = await load()
  const conn = db.createDb(url)
  try {
    const ctx = { S, E, db, conn }
    if (seed !== null) await draw(ctx, seed)
    else await truthOfPoint(ctx, positional)
  } finally {
    await conn.client.end({ timeout: 5 })
  }
}

try {
  await main()
} catch (err) {
  console.error(`\npl-truth: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(err instanceof Exit ? err.code : 1)
}
