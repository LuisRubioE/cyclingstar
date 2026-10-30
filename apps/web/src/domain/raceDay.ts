/**
 * EL TÍTULO DE UN DÍA DE CARRERA del diario (`carrera:race-jaen:e1` → `Jaen · Stage 1`; E3, PR 21h): la carrera
 * de su clave, con sus palabras en mayúscula, y su etapa. La clave no trae el nombre de la carrera, y aquí no se
 * sabe (`Race Jaén`); antes se enseñaba la clave cruda en el informe del bloque, y en `Where the energy went`, en
 * minúscula con un `capitalize` del CSS. Null en lo que no es un día de carrera. En su propio módulo, y no en
 * `words.ts`, que va en el trozo del arranque: solo lo usa la ficha.
 */
export function raceDayTitle(activity: string): string | null {
  const [tipo, raceId, etapa] = activity.split(':')
  if (tipo !== 'carrera' || raceId === undefined || raceId === '') return null
  const nombre = raceId
    .replace(/^race-/, '')
    .split('-')
    .map((w) => (w === '' ? w : `${w[0]!.toUpperCase()}${w.slice(1)}`))
    .join(' ')
  return etapa?.startsWith('e') ? `${nombre} · Stage ${etapa.slice(1)}` : nombre
}
