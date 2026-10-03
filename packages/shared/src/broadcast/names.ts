/**
 * LAS PALABRAS DE LA RETRANSMISIÓN (E2, docs/retransmision.md §6.3; D-18, DD-04).
 *
 * Un solo vocabulario de grupos para la barra, la radio servida, la capa fija y la voz: la regla C7 del
 * dueño, «un solo concepto, con el mismo nombre, en el motor y en la Race Radio» (`docs/balance.md`,
 * v34). El código es `GroupRole` (y `GroupLabel`, `instant.ts`); las palabras, las de SPEC §6.15
 * (`Bunch`, `Lead group`, `Chase group`) más `Gruppetto` (DD-04, con su valor por defecto). El grupo
 * del maillot se llama igual en la barra y en la voz (6-b).
 *
 * Nace en el PR 3a con `GROUP_WORDS` y `groupLabelText`; la frase de la fuga, la ronda de la moto, los
 * nombrados de cada grupo, la línea de quién tira y los textos del rótulo llegan en el 6b (§17.20).
 */
import type { JerseyKind } from '../jerseys.js'
import type { GroupLabel, GroupRole } from './instant.js'
import type { RiderIx } from './timeline.js'

/** EL VOCABULARIO ÚNICO de grupos (D-18): [barra, voz]. Un papel o un maillot nuevo no compila sin su palabra. */
export const GROUP_WORDS = {
  role: {
    lead: ['Lead group', 'the lead group'],
    chase: ['Chase group', 'the chase group'],
    bunch: ['Bunch', 'the bunch'], // DD-04: `Peloton` es la alternativa
    gruppetto: ['Gruppetto', 'the gruppetto'],
  },
  together: ['Bunch together', 'the bunch'],
  jersey: {
    // el grupo del maillot, igual en la barra, la radio servida, la capa fija y la voz (6-b)
    gc: ['Race leader’s group', 'the race leader’s group'],
    points: ['Points leader’s group', 'the points leader’s group'],
    kom: ['Mountains leader’s group', 'the mountains leader’s group'], // «Mountains leader», como JERSEY_LABEL
  },
} as const satisfies {
  readonly role: Readonly<Record<GroupRole, readonly [string, string]>>
  readonly together: readonly [string, string]
  readonly jersey: Readonly<Record<JerseyKind, readonly [string, string]>>
}

/** Dónde se dice: la fila de la barra (y la capa fija) o la voz. */
export type GroupWordsForm = 'bar' | 'voice'

/**
 * EL TEXTO DE UNA ETIQUETA (§6.3). Nace con el `locale` delante, con el tipo literal `'en'` y el nombre
 * `_locale` mientras no lo lea (12-q, D-62). La barra escribe la palabra tal cual (las mayúsculas de
 * `LEAD GROUP` son presentación); la voz, en minúsculas y con artículo. Un grupo de tres o menos se
 * nombra por sus corredores: en la barra separados por `·`, en la voz como lista («A, B and C»); los
 * nombres los pone quien llama (`name`), y en la voz, con la identidad entera.
 */
export function groupLabelText(
  _locale: 'en',
  label: GroupLabel,
  role: GroupRole,
  form: GroupWordsForm,
  name: (rider: RiderIx) => string,
): string {
  const i = form === 'bar' ? 0 : 1
  switch (label.k) {
    case 'together':
      return GROUP_WORDS.together[i]
    case 'role':
      return GROUP_WORDS.role[role][i]
    case 'jersey_group':
      return GROUP_WORDS.jersey[label.jersey][i]
    case 'names': {
      const names = label.riders.map(name)
      if (form === 'bar') return names.join(' · ')
      if (names.length <= 1) return names[0] ?? GROUP_WORDS.role[role][1]
      return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]!}`
    }
  }
}
