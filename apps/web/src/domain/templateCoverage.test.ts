/// <reference types="node" />
import { readFileSync } from 'node:fs'
import {
  CUE_OF_TEMPLATE,
  REVEAL_RULES,
  type RevealRule,
  TT_REVEAL_RULES,
} from '@cyclingstar/shared'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { chronicleLine } from './stageJournal'

/**
 * B7 · LA COBERTURA DE LAS PLANTILLAS (docs/retransmision.md §12.5 y §16.4; D-44; paso 6b). Recorre
 * con el AST de TypeScript (la dependencia `typescript` de la raíz) las llamadas a `emit` de
 * `simulate.ts` y `timetrial.ts` y la inserción de `events.ts` (`rider_defies_team`), y recoge la
 * plantilla solo en posiciones de valor: un literal y las dos ramas de un ternario; una calculada en
 * tiempo de ejecución hace fallar el test. Exige que el conjunto sea el escrito aquí (54, medido en
 * `l8/plantillas.mjs`: 44 de carretera, `rider_defies_team` y las 13 de la crono, cuatro compartidas)
 * más `crash`, la caída que sintetiza el grabador (D-13); que cada una tenga fila en
 * `CUE_OF_TEMPLATE` y la regla de revelado escrita aquí (la de `REVEAL_RULES` o `TT_REVEAL_RULES`, o la
 * de por defecto, apuntada a propósito); y que `chronicleLine` dé una frase no vacía para un suceso
 * sintético de cada una. Una plantilla nueva del motor pone este test en rojo hasta que tiene frase,
 * rótulo y regla.
 *
 * Lee ficheros del motor, así que lleva la referencia a los tipos de Node. Lo que la voz servida dice
 * de los grupos lo vigila `stageJournal.test.ts` (los siete nombres, §12.6).
 */

/** Las 54 que emite el motor (v91), por orden alfabético. */
const ENGINE_TEMPLATES = [
  'attack_go',
  'attack_reeled',
  'attack_sticks',
  'attack_swarm',
  'break_cooperation',
  'break_share',
  'breakaway_caught',
  'breakaway_formed',
  'bridge_failed',
  'bridge_made',
  'bunch_sprint',
  'chase_work',
  'climb_kom',
  'domestiques_drop_back',
  'echelon_close',
  'echelon_split',
  'final_km',
  'front_group',
  'group_overtake',
  'leader_dropped',
  'mechanical',
  'move_caught',
  'move_faded',
  'move_merge',
  'no_help_for_leader',
  'peloton_concedes',
  'peloton_pull',
  'peloton_regroup',
  'peloton_selection',
  'peloton_split',
  'puncture',
  'rain_front',
  'rider_abandons',
  'rider_bonks',
  'rider_defies_team',
  'rider_sits_up',
  'sprint_intermediate',
  'sprinters_chase',
  'sprinters_give_up',
  'stage_win',
  'stage_win_itt',
  'time_cut',
  'time_cut_readmitted',
  'time_gap',
  'truce_denied',
  'truce_granted',
  'tt_best_time',
  'tt_catch',
  'tt_catches',
  'tt_first_time',
  'tt_last_home',
  'tt_last_off',
  'tt_split',
  'tt_start_order',
] as const

/** Las 13 de la crono (`timetrial.ts`), cuatro compartidas con la carretera. */
const TT_TEMPLATES = [
  'mechanical',
  'puncture',
  'stage_win_itt',
  'time_cut',
  'time_cut_readmitted',
  'tt_best_time',
  'tt_catch',
  'tt_catches',
  'tt_first_time',
  'tt_last_home',
  'tt_last_off',
  'tt_split',
  'tt_start_order',
] as const

/**
 * LA REGLA DE REVELADO DE CADA UNA (§4.7), escrita aquí: en carretera, las que no son `emit`; en crono,
 * las que no son `tt_race_clock`. El resto va con la de por defecto, a propósito.
 */
const ROAD_RULES: Readonly<Record<string, RevealRule>> = {
  breakaway_formed: 'emit',
  break_cooperation: 'emit',
  peloton_concedes: 'emit',
  rider_defies_team: 'next_emit',
  climb_kom: 'banner',
  sprint_intermediate: 'banner',
  crash: 'incident',
  puncture: 'incident',
  mechanical: 'incident',
  bunch_sprint: 'finish',
  final_km: 'finish',
  stage_win: 'finish',
  time_cut: 'finish',
  time_cut_readmitted: 'finish',
}
const TT_RULES: Readonly<Record<string, RevealRule>> = {
  puncture: 'tt_own_clock',
  mechanical: 'tt_own_clock',
  stage_win_itt: 'finish',
  tt_last_home: 'finish',
  tt_catches: 'finish',
  time_cut: 'finish',
  time_cut_readmitted: 'finish',
}

/** Las plantillas de un fichero del motor, en posiciones de valor; las calculadas, aparte. */
function templatesOf(path: string): { readonly found: string[]; readonly computed: string[] } {
  const src = readFileSync(new URL(path, import.meta.url), 'utf8')
  const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const computed: string[] = []
  const valuesOf = (e: ts.Expression): void => {
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) found.push(e.text)
    else if (ts.isConditionalExpression(e)) {
      valuesOf(e.whenTrue)
      valuesOf(e.whenFalse)
    } else if (ts.isParenthesizedExpression(e)) valuesOf(e.expression)
    else computed.push(e.getText(sf))
  }
  const insertion = path.endsWith('events.ts')
  const visit = (n: ts.Node): void => {
    // EventLog.emit(km, tS, tipo, plantilla, protagonistas, datos): la plantilla, el cuarto
    if (
      !insertion &&
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === 'emit'
    ) {
      const arg = n.arguments[3]
      if (arg !== undefined) valuesOf(arg)
    }
    // events.ts inserta el suceso entero: su `plantilla:` (announceRebels)
    if (
      insertion &&
      ts.isPropertyAssignment(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === 'plantilla'
    )
      valuesOf(n.initializer)
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return { found, computed }
}

const ENGINE = '../../../../packages/engine/src/stage/'

describe('B7 · toda plantilla del motor tiene frase, rótulo y regla de revelado (§16.4)', () => {
  const road = templatesOf(`${ENGINE}simulate.ts`)
  const tt = templatesOf(`${ENGINE}timetrial.ts`)
  const rebels = templatesOf(`${ENGINE}events.ts`)

  it('ninguna plantilla calculada en tiempo de ejecución: el AST las ve todas', () => {
    expect([...road.computed, ...tt.computed, ...rebels.computed]).toEqual([])
  })

  it('las 54 del motor: 44 de carretera, rider_defies_team y las 13 de la crono, cuatro compartidas', () => {
    const roadSet = new Set(road.found)
    const ttSet = new Set(tt.found)
    expect(roadSet.size).toBe(44)
    expect([...new Set(rebels.found)]).toEqual(['rider_defies_team'])
    expect([...ttSet].sort()).toEqual([...TT_TEMPLATES])
    expect([...ttSet].filter((p) => roadSet.has(p)).sort()).toEqual([
      'mechanical',
      'puncture',
      'time_cut',
      'time_cut_readmitted',
    ])
    expect([...new Set([...road.found, ...tt.found, ...rebels.found])].sort()).toEqual([
      ...ENGINE_TEMPLATES,
    ])
  })

  it.each([...ENGINE_TEMPLATES, 'crash'])('%s: su destino en CUE_OF_TEMPLATE y su regla', (p) => {
    expect(Object.hasOwn(CUE_OF_TEMPLATE, p), 'CUE_OF_TEMPLATE').toBe(true)
    expect(REVEAL_RULES[p] ?? 'emit').toBe(ROAD_RULES[p] ?? 'emit')
    if ((TT_TEMPLATES as readonly string[]).includes(p))
      expect(TT_REVEAL_RULES[p] ?? 'tt_race_clock').toBe(TT_RULES[p] ?? 'tt_race_clock')
  })

  it.each([...ENGINE_TEMPLATES, 'crash'])(
    '%s: una frase, nunca vacía ni la clave cruda (D-44)',
    (p) => {
      const line = chronicleLine({
        km: 50,
        tS: 3000,
        plantilla: p,
        protagonists: [
          { id: null, name: 'Ana Ruiz', bib: 11, team: 'Team Sol', country: null },
          { id: null, name: 'Bea Roca', bib: 12, team: 'Team Luna', country: null },
        ],
        datos: {},
      })
      expect(line).not.toBe('')
      expect(line.startsWith(`${p}:`)).toBe(false)
    },
  )

  it('las tablas de reglas de shared no tienen plantillas que el motor no emite', () => {
    const known = new Set<string>([...ENGINE_TEMPLATES, 'crash'])
    expect(Object.keys(REVEAL_RULES).filter((p) => !known.has(p))).toEqual([])
    expect(Object.keys(TT_REVEAL_RULES).filter((p) => !known.has(p))).toEqual([])
  })
})
