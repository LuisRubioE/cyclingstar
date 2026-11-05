/** El nombre de cada carrera por su id (`race-liege` → `Race Liège`), de los resultados del corredor. */
export type RaceNames = ReadonlyMap<string, string>

/** Los nombres de las carreras de unos resultados: `GET /api/riders/:id/results` trae el de cada una. */
export function raceNamesOf(
  results: readonly { readonly raceId: string; readonly raceName: string }[],
): RaceNames {
  return new Map(results.map((r) => [r.raceId, r.raceName]))
}

/**
 * EL TÍTULO DE UN DÍA DE CARRERA del diario (`carrera:race-liege:e2` → `Race Liège · Stage 2`; E3, PR 21h): la
 * carrera por su nombre, el de los resultados del corredor (`names`), y su etapa. La clave no trae el nombre, y
 * sin él se saca de ella, con sus palabras en mayúscula y sin tildes (`Liege · Stage 2`); antes se enseñaba la
 * clave cruda en el informe del bloque, y en `Where the energy went`, en minúscula con un `capitalize` del CSS.
 * Null en lo que no es un día de carrera. En su propio módulo, y no en `words.ts`, que va en el trozo del
 * arranque: solo lo usa la ficha.
 */
export function raceDayTitle(activity: string, names?: RaceNames): string | null {
  const [tipo, raceId, etapa] = activity.split(':')
  if (tipo !== 'carrera' || raceId === undefined || raceId === '') return null
  const nombre =
    names?.get(raceId) ??
    raceId
      .replace(/^race-/, '')
      .split('-')
      .map((w) => (w === '' ? w : `${w[0]!.toUpperCase()}${w.slice(1)}`))
      .join(' ')
  return etapa?.startsWith('e') ? `${nombre} · Stage ${etapa.slice(1)}` : nombre
}
